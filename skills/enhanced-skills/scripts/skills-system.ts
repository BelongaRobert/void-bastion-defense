/**
 * Enhanced Skills System for OpenClaw
 * Based on architectural patterns from Claude Code (clean room implementation)
 */

import { readFileSync, readdirSync, statSync, watch } from 'fs'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'

// Types
interface SkillFrontmatter {
  name: string
  description: string
  whenToUse: string
  version?: string
  features?: string[]
  enabled?: boolean
  tokens?: number | 'auto'
  lazy?: boolean
}

interface Skill {
  name: string
  source: 'bundled' | 'user' | 'project'
  frontmatter: SkillFrontmatter
  content: string
  filePath: string
  estimatedTokens: number
}

interface SkillRegistry {
  skills: Map<string, Skill>
  featureFlags: Set<string>
}

// Registry
const registry: SkillRegistry = {
  skills: new Map(),
  featureFlags: new Set()
}

// Skill source directories (in priority order)
const SKILL_SOURCES = [
  { path: '~/.openclaw/workspace/skills', source: 'bundled' as const },
  { path: '~/.openclaw/skills', source: 'user' as const },
  { path: '~/.openclaw/workspace/.openclaw/skills', source: 'project' as const }
]

/**
 * Expand ~ to home directory
 */
function expandHome(path: string): string {
  if (path.startsWith('~/')) {
    return join(process.env.HOME || process.env.USERPROFILE || '', path.slice(2))
  }
  return path
}

/**
 * Parse YAML frontmatter from markdown content
 * Clean room implementation - not copied from source
 */
function parseFrontmatter(content: string): { data: Partial<SkillFrontmatter>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return { data: {}, body: content }
  }
  
  const yamlContent = match[1]
  const body = match[2]
  
  // Simple YAML parser (handles basic key: value pairs)
  const data: Partial<SkillFrontmatter> = {}
  const lines = yamlContent.split('\n')
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      let value: any = line.slice(colonIndex + 1).trim()
      
      // Handle arrays (features: ["flag1", "flag2"])
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value.replace(/'/g, '"'))
        } catch {
          value = value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/"/g, ''))
        }
      }
      // Handle booleans
      else if (value === 'true') value = true
      else if (value === 'false') value = false
      // Handle numbers
      else if (!isNaN(Number(value)) && value !== '') value = Number(value)
      
      data[key as keyof SkillFrontmatter] = value
    }
  }
  
  return { data, body }
}

/**
 * Estimate token count using rough heuristic
 * Clean room implementation
 */
function estimateTokens(content: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(content.length / 4)
}

/**
 * Register a skill in the registry
 */
function registerSkill(skill: Skill): void {
  registry.skills.set(skill.name, skill)
  console.log(`[Skills] Registered: ${skill.name} (${skill.source}, ~${skill.estimatedTokens} tokens)`)
}

/**
 * Load a single skill file
 */
async function loadSkillFile(filePath: string, source: 'bundled' | 'user' | 'project'): Promise<Skill | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const { data, body } = parseFrontmatter(content)
    
    if (!data.name || !data.description) {
      console.warn(`[Skills] Skipping ${filePath}: missing required frontmatter (name, description)`)
      return null
    }
    
    const estimatedTokens = data.tokens === 'auto' || !data.tokens 
      ? estimateTokens(content)
      : data.tokens
    
    return {
      name: data.name,
      source,
      frontmatter: data as SkillFrontmatter,
      content: body,
      filePath,
      estimatedTokens
    }
  } catch (err) {
    console.error(`[Skills] Error loading ${filePath}:`, err)
    return null
  }
}

/**
 * Recursively find all .md files in directory
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = []
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  } catch (err) {
    // Directory doesn't exist, skip
  }
  
  return files
}

/**
 * Load all skills from a source directory
 */
async function loadSkillsFromSource(
  sourcePath: string, 
  source: 'bundled' | 'user' | 'project'
): Promise<Skill[]> {
  const expandedPath = expandHome(sourcePath)
  const files = findMarkdownFiles(expandedPath)
  
  const skills: Skill[] = []
  
  for (const file of files) {
    const skill = await loadSkillFile(file, source)
    if (skill && isSkillEnabled(skill)) {
      skills.push(skill)
    }
  }
  
  return skills
}

/**
 * Check if skill is enabled based on feature flags
 */
function isSkillEnabled(skill: Skill): boolean {
  if (skill.frontmatter.enabled === false) return false
  
  // Check feature flags
  if (skill.frontmatter.features) {
    for (const feature of skill.frontmatter.features) {
      if (!registry.featureFlags.has(feature)) {
        return false
      }
    }
  }
  
  return true
}

/**
 * Enable a feature flag
 */
function enableFeature(flag: string): void {
  registry.featureFlags.add(flag)
  console.log(`[Skills] Feature enabled: ${flag}`)
}

/**
 * Check if feature is enabled
 */
function isFeatureEnabled(flag: string): boolean {
  return registry.featureFlags.has(flag)
}

/**
 * Auto-discover and load all skills from all sources
 */
async function autoDiscoverSkills(): Promise<Skill[]> {
  console.log('[Skills] Auto-discovering skills...')
  
  const allSkills: Skill[] = []
  
  // Load from each source in priority order
  for (const { path, source } of SKILL_SOURCES) {
    const skills = await loadSkillsFromSource(path, source)
    
    for (const skill of skills) {
      // Higher priority sources override lower ones
      registerSkill(skill)
      allSkills.push(skill)
    }
  }
  
  console.log(`[Skills] Loaded ${allSkills.length} skills total`)
  return allSkills
}

/**
 * Get a registered skill by name
 */
function getSkill(name: string): Skill | undefined {
  return registry.skills.get(name)
}

/**
 * List all registered skills
 */
function listSkills(): Skill[] {
  return Array.from(registry.skills.values())
}

/**
 * Watch skill directories for changes (hot reload)
 */
function watchSkills(onChange: (skill: Skill) => void): void {
  for (const { path, source } of SKILL_SOURCES) {
    const expandedPath = expandHome(path)
    
    try {
      const watcher = watch(expandedPath, { recursive: true }, async (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
          const filePath = join(expandedPath, filename)
          const skill = await loadSkillFile(filePath, source)
          
          if (skill && isSkillEnabled(skill)) {
            registerSkill(skill)
            onChange(skill)
          }
        }
      })
      
      console.log(`[Skills] Watching ${expandedPath} for changes`)
    } catch (err) {
      console.warn(`[Skills] Could not watch ${expandedPath}:`, err)
    }
  }
}

/**
 * Load feature flags from config
 */
function loadFeatureFlags(config: { features?: Record<string, boolean> }): void {
  if (config.features) {
    for (const [flag, enabled] of Object.entries(config.features)) {
      if (enabled) {
        enableFeature(flag)
      }
    }
  }
}

// Export API
export {
  // Core functions
  parseFrontmatter,
  estimateTokens,
  registerSkill,
  loadSkillFile,
  loadSkillsFromSource,
  autoDiscoverSkills,
  watchSkills,
  
  // Feature flags
  enableFeature,
  isFeatureEnabled,
  loadFeatureFlags,
  
  // Registry access
  getSkill,
  listSkills,
  registry,
  
  // Types
  Skill,
  SkillFrontmatter,
  SkillRegistry
}

// Default export
export default {
  autoDiscoverSkills,
  watchSkills,
  enableFeature,
  isFeatureEnabled,
  getSkill,
  listSkills,
  loadFeatureFlags
}
