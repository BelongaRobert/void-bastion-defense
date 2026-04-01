/**
 * Memory Layers System for OpenClaw
 * Based on Claude Code memory patterns (clean room implementation)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from 'fs'
import { readFile, writeFile, appendFile } from 'fs/promises'
import { join } from 'path'

// Types
interface MemoryEntry {
  id: string
  content: string
  date: Date
  source: string
  layer: 'working' | 'project' | 'personal'
}

interface MemoryLayer {
  name: string
  path: string
  entries: MemoryEntry[]
}

interface ClassificationResult {
  suggestedLayer: 'working' | 'project' | 'personal'
  confidence: number
  reasoning: string
}

interface DuplicateGroup {
  entries: MemoryEntry[]
  similarity: number
}

// Configuration
const MEMORY_CONFIG = {
  workingDir: 'memory/',
  projectFile: 'MEMORY.md',
  personalFile: 'MEMORY.local.md',
  workspace: '~/.openclaw/workspace/'
}

/**
 * Expand home directory
 */
function expandHome(path: string): string {
  if (path.startsWith('~/')) {
    return join(process.env.HOME || process.env.USERPROFILE || '', path.slice(2))
  }
  return path
}

/**
 * Generate unique entry ID
 */
function generateEntryId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Parse memory file into entries
 */
function parseMemoryFile(content: string, source: string, layer: 'working' | 'project' | 'personal'): MemoryEntry[] {
  const entries: MemoryEntry[] = []
  
  // Split by headers (## or ###)
  const sections = content.split(/\n(?=##+\s)/)
  
  for (const section of sections) {
    if (section.trim()) {
      entries.push({
        id: generateEntryId(),
        content: section.trim(),
        date: new Date(),
        source,
        layer
      })
    }
  }
  
  return entries
}

/**
 * Classify where an entry belongs
 */
function classifyEntry(content: string): ClassificationResult {
  const lowerContent = content.toLowerCase()
  
  // Project indicators
  const projectIndicators = [
    'convention', 'workflow', 'team', 'shared', 'project',
    'everyone should', 'we use', 'standard',
    'git', 'deploy', 'build', 'test'
  ]
  
  // Personal indicators
  const personalIndicators = [
    'i prefer', 'my preference', 'i like', 'i want',
    'personal', 'private', 'just for me',
    'call me', 'my name is', 'i am'
  ]
  
  // Working indicators
  const workingIndicators = [
    'today', 'session', 'just', 'temporary',
    'trying', 'experiment', 'note to self'
  ]
  
  let projectScore = 0
  let personalScore = 0
  let workingScore = 0
  
  for (const indicator of projectIndicators) {
    if (lowerContent.includes(indicator)) projectScore++
  }
  
  for (const indicator of personalIndicators) {
    if (lowerContent.includes(indicator)) personalScore++
  }
  
  for (const indicator of workingIndicators) {
    if (lowerContent.includes(indicator)) workingScore++
  }
  
  // Determine best layer
  const scores = [
    { layer: 'project' as const, score: projectScore },
    { layer: 'personal' as const, score: personalScore },
    { layer: 'working' as const, score: workingScore }
  ]
  
  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]
  
  return {
    suggestedLayer: best.layer,
    confidence: Math.min(best.score / 3, 1),
    reasoning: `Matched ${best.score} ${best.layer} indicators`
  }
}

/**
 * Calculate text similarity (0-1)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)
  
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

/**
 * Find duplicate entries across layers
 */
function findDuplicates(entries: MemoryEntry[], threshold = 0.7): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const processed = new Set<string>()
  
  for (let i = 0; i < entries.length; i++) {
    if (processed.has(entries[i].id)) continue
    
    const group: MemoryEntry[] = [entries[i]]
    processed.add(entries[i].id)
    
    for (let j = i + 1; j < entries.length; j++) {
      if (processed.has(entries[j].id)) continue
      
      const similarity = calculateSimilarity(
        entries[i].content,
        entries[j].content
      )
      
      if (similarity >= threshold) {
        group.push(entries[j])
        processed.add(entries[j].id)
      }
    }
    
    if (group.length > 1) {
      groups.push({
        entries: group,
        similarity: calculateSimilarity(group[0].content, group[1]?.content || '')
      })
    }
  }
  
  return groups
}

/**
 * Load all memory entries
 */
async function loadAllMemory(): Promise<MemoryEntry[]> {
  const entries: MemoryEntry[] = []
  const workspacePath = expandHome(MEMORY_CONFIG.workspace)
  
  // Load working memory (daily files)
  const memoryDir = join(workspacePath, MEMORY_CONFIG.workingDir)
  if (existsSync(memoryDir)) {
    const files = readdirSync(memoryDir).filter(f => f.endsWith('.md'))
    
    for (const file of files) {
      const content = await readFile(join(memoryDir, file), 'utf-8')
      const fileEntries = parseMemoryFile(content, file, 'working')
      entries.push(...fileEntries)
    }
  }
  
  // Load project memory
  const projectPath = join(workspacePath, MEMORY_CONFIG.projectFile)
  if (existsSync(projectPath)) {
    const content = await readFile(projectPath, 'utf-8')
    const fileEntries = parseMemoryFile(content, MEMORY_CONFIG.projectFile, 'project')
    entries.push(...fileEntries)
  }
  
  // Load personal memory
  const personalPath = join(workspacePath, MEMORY_CONFIG.personalFile)
  if (existsSync(personalPath)) {
    const content = await readFile(personalPath, 'utf-8')
    const fileEntries = parseMemoryFile(content, MEMORY_CONFIG.personalFile, 'personal')
    entries.push(...fileEntries)
  }
  
  return entries
}

/**
 * Promote entry to different layer
 */
async function promoteToLayer(
  entry: MemoryEntry,
  targetLayer: 'working' | 'project' | 'personal'
): Promise<void> {
  const workspacePath = expandHome(MEMORY_CONFIG.workspace)
  
  if (targetLayer === 'project') {
    const projectPath = join(workspacePath, MEMORY_CONFIG.projectFile)
    const content = `\n\n## ${new Date().toISOString().split('T')[0]}\n\n${entry.content}`
    await appendFile(projectPath, content)
  } else if (targetLayer === 'personal') {
    const personalPath = join(workspacePath, MEMORY_CONFIG.personalFile)
    const content = `\n\n## ${new Date().toISOString().split('T')[0]}\n\n${entry.content}`
    await appendFile(personalPath, content)
  }
  
  // Note: Working memory is auto-generated, no need to promote there
}

/**
 * Review memory and propose changes
 */
async function reviewMemory(
  layer: 'working' | 'project' | 'personal' | 'all' = 'all',
  since?: Date
): Promise<{
  promotions: { entry: MemoryEntry; toLayer: 'working' | 'project' | 'personal' }[]
  duplicates: DuplicateGroup[]
}>> {
  const entries = await loadAllMemory()
  
  // Filter by layer if specified
  const filteredEntries = layer === 'all' 
    ? entries 
    : entries.filter(e => e.layer === layer)
  
  // Filter by date if specified
  const dateFiltered = since
    ? filteredEntries.filter(e => e.date >= since)
    : filteredEntries
  
  const promotions: { entry: MemoryEntry; toLayer: 'working' | 'project' | 'personal' }[] = []
  
  // Classify each working memory entry
  for (const entry of dateFiltered.filter(e => e.layer === 'working')) {
    const classification = classifyEntry(entry.content)
    
    if (classification.confidence > 0.5 && classification.suggestedLayer !== 'working') {
      promotions.push({
        entry,
        toLayer: classification.suggestedLayer
      })
    }
  }
  
  // Find duplicates
  const duplicates = findDuplicates(dateFiltered)
  
  return { promotions, duplicates }
}

/**
 * Get memory statistics
 */
async function getMemoryStats(): Promise<{
  total: number
  byLayer: Record<string, number>
  byDate: Record<string, number>
}> {
  const entries = await loadAllMemory()
  
  const byLayer: Record<string, number> = {
    working: 0,
    project: 0,
    personal: 0
  }
  
  const byDate: Record<string, number> = {}
  
  for (const entry of entries) {
    byLayer[entry.layer]++
    
    const dateKey = entry.date.toISOString().split('T')[0]
    byDate[dateKey] = (byDate[dateKey] || 0) + 1
  }
  
  return {
    total: entries.length,
    byLayer,
    byDate
  }
}

/**
 * Initialize memory system
 */
function initializeMemorySystem(): void {
  const workspacePath = expandHome(MEMORY_CONFIG.workspace)
  const memoryDir = join(workspacePath, MEMORY_CONFIG.workingDir)
  
  // Create directories if they don't exist
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true })
  }
  
  // Create personal memory file if it doesn't exist
  const personalPath = join(workspacePath, MEMORY_CONFIG.personalFile)
  if (!existsSync(personalPath)) {
    writeFileSync(personalPath, '# Personal Memory\n\nPrivate preferences and notes.\n')
  }
  
  console.log('[Memory] System initialized')
}

// Export API
export {
  // Core functions
  loadAllMemory,
  reviewMemory,
  promoteToLayer,
  findDuplicates,
  classifyEntry,
  calculateSimilarity,
  getMemoryStats,
  initializeMemorySystem,
  
  // Types
  MemoryEntry,
  MemoryLayer,
  ClassificationResult,
  DuplicateGroup
}

// Default export
export default {
  loadAllMemory,
  reviewMemory,
  promoteToLayer,
  findDuplicates,
  getMemoryStats,
  initializeMemorySystem
}
