/**
 * DaSage Core Integration Layer
 * Wires together Enhanced Skills, Memory Layers, and Feature Flags
 */

import { initializeFeatureFlags, isEnabled, getAllFlags } from '../skills/feature-flags/scripts/feature-flags'
import { initializeMemorySystem, loadAllMemory, reviewMemory } from '../skills/memory-layers/scripts/memory-system'
import { autoDiscoverSkills, watchSkills, listSkills, getSkill } from '../skills/enhanced-skills/scripts/skills-system'

// Types
interface DaSageContext {
  skills: ReturnType<typeof listSkills>
  memory: Awaited<ReturnType<typeof loadAllMemory>>
  features: ReturnType<typeof getAllFlags>
  user: {
    name: string
    timezone: string
    preferences: Record<string, any>
  }
}

/**
 * Initialize DaSage with all enhancement systems
 */
async function initializeDaSage(): Promise<DaSageContext> {
  console.log('[DaSage] Initializing enhanced systems...')
  
  // Phase 1: Feature Flags (must be first)
  initializeFeatureFlags()
  console.log('[DaSage] Feature flags loaded')
  
  // Phase 2: Memory System
  initializeMemorySystem()
  const memory = await loadAllMemory()
  console.log(`[DaSage] Memory system loaded (${memory.length} entries)`)
  
  // Phase 3: Skills (conditional on feature flags)
  if (isEnabled('ENHANCED_SKILLS')) {
    const skills = await autoDiscoverSkills()
    console.log(`[DaSage] Enhanced skills loaded (${skills.length} skills)`)
    
    // Watch for skill changes
    watchSkills((skill) => {
      console.log(`[DaSage] Skill updated: ${skill.name}`)
    })
  } else {
    console.log('[DaSage] Using legacy skill system')
  }
  
  // Load user preferences from personal memory
  const context: DaSageContext = {
    skills: listSkills(),
    memory,
    features: getAllFlags(),
    user: {
      name: 'Robert',
      timezone: 'America/New_York',
      preferences: loadUserPreferences()
    }
  }
  
  console.log('[DaSage] Initialization complete!')
  return context
}

/**
 * Load user preferences from personal memory
 */
function loadUserPreferences(): Record<string, any> {
  // In real implementation, would parse MEMORY.local.md
  return {
    communicationStyle: 'friendly_but_direct',
    codeStyle: 'typescript_preferred',
    timezone: 'America/New_York',
    workHours: { start: 8, end: 23 }
  }
}

/**
 * Run memory review on startup
 */
async function startupMemoryReview(): Promise<void> {
  if (isEnabled('AUTO_MEMORY_REVIEW')) {
    console.log('[DaSage] Running memory review...')
    const { promotions, duplicates } = await reviewMemory('working')
    
    if (promotions.length > 0) {
      console.log(`[DaSage] Found ${promotions.length} entries to promote`)
      // Would prompt user for approval
    }
    
    if (duplicates.length > 0) {
      console.log(`[DaSage] Found ${duplicates.length} duplicate groups`)
    }
  }
}

/**
 * Get enhanced context for responses
 */
async function getEnhancedContext(): Promise<DaSageContext> {
  return {
    skills: listSkills(),
    memory: await loadAllMemory(),
    features: getAllFlags(),
    user: {
      name: 'Robert',
      timezone: 'America/New_York',
      preferences: loadUserPreferences()
    }
  }
}

/**
 * Check if skill should be loaded
 */
function shouldLoadSkill(skillName: string): boolean {
  const skill = getSkill(skillName)
  if (!skill) return false
  
  // Check feature flags
  if (skill.frontmatter.features) {
    return skill.frontmatter.features.every(flag => isEnabled(flag))
  }
  
  return true
}

/**
 * Log system status
 */
function logSystemStatus(context: DaSageContext): void {
  console.log('\n=== DaSage System Status ===')
  console.log(`User: ${context.user.name}`)
  console.log(`Timezone: ${context.user.timezone}`)
  console.log(`Skills loaded: ${context.skills.length}`)
  console.log(`Memory entries: ${context.memory.length}`)
  console.log(`Features enabled: ${Object.entries(context.features).filter(([_, v]) => v).length}/${Object.keys(context.features).length}`)
  console.log('============================\n')
}

// Export integration API
export {
  initializeDaSage,
  startupMemoryReview,
  getEnhancedContext,
  shouldLoadSkill,
  loadUserPreferences,
  logSystemStatus
}

export default {
  initializeDaSage,
  startupMemoryReview,
  getEnhancedContext
}
