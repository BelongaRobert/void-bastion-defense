/**
 * Feature Flags System for OpenClaw
 * Based on standard feature flag patterns (clean room implementation)
 */

import { existsSync, readFileSync, writeFileSync, watch } from 'fs'
import { join } from 'path'

// Types
type FeatureFlagValue = boolean | string | number

interface FeatureFlagsConfig {
  features: Record<string, FeatureFlagValue>
}

interface FlagSource {
  name: string
  priority: number
  getFlags(): Record<string, FeatureFlagValue>
}

// Flag registry
const flagRegistry: Map<string, FeatureFlagValue> = new Map()
const flagSources: FlagSource[] = []

// Configuration paths
const CONFIG_PATHS = {
  user: '~/.openclaw/config.json',
  project: '~/.openclaw/workspace/.openclaw/config.json',
  env: 'environment'
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
 * Load config from file
 */
function loadConfigFile(path: string): FeatureFlagsConfig | null {
  try {
    const expandedPath = expandHome(path)
    if (!existsSync(expandedPath)) return null
    
    const content = readFileSync(expandedPath, 'utf-8')
    return JSON.parse(content) as FeatureFlagsConfig
  } catch {
    return null
  }
}

/**
 * Parse environment variables for feature flags
 */
function parseEnvFlags(): Record<string, FeatureFlagValue> {
  const flags: Record<string, FeatureFlagValue> = {}
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('DASAGE_FEATURE_')) {
      const flagName = key.replace('DASAGE_FEATURE_', '')
      
      // Parse value
      if (value === 'true') flags[flagName] = true
      else if (value === 'false') flags[flagName] = false
      else if (!isNaN(Number(value))) flags[flagName] = Number(value)
      else flags[flagName] = value || ''
    }
  }
  
  return flags
}

/**
 * Initialize flag sources
 */
function initializeSources(): void {
  // Environment variables (highest priority)
  flagSources.push({
    name: 'environment',
    priority: 1,
    getFlags: parseEnvFlags
  })
  
  // User config
  flagSources.push({
    name: 'user',
    priority: 2,
    getFlags: () => {
      const config = loadConfigFile(CONFIG_PATHS.user)
      return config?.features || {}
    }
  })
  
  // Project config
  flagSources.push({
    name: 'project',
    priority: 3,
    getFlags: () => {
      const config = loadConfigFile(CONFIG_PATHS.project)
      return config?.features || {}
    }
  })
  
  // Sort by priority (lower number = higher priority)
  flagSources.sort((a, b) => a.priority - b.priority)
}

/**
 * Load all flags from all sources
 */
function loadAllFlags(): Record<string, FeatureFlagValue> {
  const mergedFlags: Record<string, FeatureFlagValue> = {}
  
  // Load from each source (later sources override earlier)
  for (const source of flagSources) {
    const flags = source.getFlags()
    Object.assign(mergedFlags, flags)
  }
  
  return mergedFlags
}

/**
 * Refresh flag registry
 */
function refreshFlags(): void {
  const flags = loadAllFlags()
  flagRegistry.clear()
  
  for (const [name, value] of Object.entries(flags)) {
    flagRegistry.set(name, value)
  }
  
  console.log(`[Flags] Loaded ${flagRegistry.size} feature flags`)
}

/**
 * Check if a feature flag is enabled
 */
function isEnabled(flag: string, defaultValue = false): boolean {
  const value = flagRegistry.get(flag)
  
  if (value === undefined) return defaultValue
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (typeof value === 'number') return value > 0
  
  return Boolean(value)
}

/**
 * Get flag value
 */
function getFlag(flag: string): FeatureFlagValue | undefined {
  return flagRegistry.get(flag)
}

/**
 * Get all flags
 */
function getAllFlags(): Record<string, FeatureFlagValue> {
  return Object.fromEntries(flagRegistry)
}

/**
 * Set flag value (runtime only)
 */
function setFlag(flag: string, value: FeatureFlagValue, persist = false): void {
  flagRegistry.set(flag, value)
  
  if (persist) {
    // Save to user config
    const config = loadConfigFile(CONFIG_PATHS.user) || { features: {} }
    config.features[flag] = value
    
    const expandedPath = expandHome(CONFIG_PATHS.user)
    writeFileSync(expandedPath, JSON.stringify(config, null, 2))
  }
  
  console.log(`[Flags] ${flag} = ${value}`)
}

/**
 * Enable a feature flag
 */
function enable(flag: string, persist = false): void {
  setFlag(flag, true, persist)
}

/**
 * Disable a feature flag
 */
function disable(flag: string, persist = false): void {
  setFlag(flag, false, persist)
}

/**
 * Toggle a feature flag
 */
function toggle(flag: string, persist = false): void {
  const current = isEnabled(flag)
  setFlag(flag, !current, persist)
}

/**
 * Require a feature flag to be enabled
 */
function requireFlag(flag: string, message?: string): void {
  if (!isEnabled(flag)) {
    throw new Error(message || `Feature '${flag}' is required but not enabled`)
  }
}

/**
 * Check if skill should be loaded based on features
 */
function shouldLoadSkill(requiredFeatures: string[]): boolean {
  return requiredFeatures.every(flag => isEnabled(flag))
}

/**
 * Watch config files for changes
 */
function watchConfigFiles(callback: () => void): void {
  const paths = [
    expandHome(CONFIG_PATHS.user),
    expandHome(CONFIG_PATHS.project)
  ]
  
  for (const path of paths) {
    try {
      watch(path, (eventType) => {
        if (eventType === 'change') {
          console.log(`[Flags] Config changed: ${path}`)
          refreshFlags()
          callback()
        }
      })
      console.log(`[Flags] Watching: ${path}`)
    } catch {
      // File doesn't exist yet, ignore
    }
  }
}

/**
 * Initialize feature flag system
 */
function initializeFeatureFlags(): void {
  initializeSources()
  refreshFlags()
  
  // Watch for changes
  watchConfigFiles(() => {
    console.log('[Flags] Flags refreshed due to config change')
  })
  
  console.log('[Flags] System initialized')
}

// Predefined flag categories
const FLAG_CATEGORIES = {
  stable: [] as string[],  // Always enabled
  beta: ['BETA_UI', 'BETA_FEATURES'],
  experimental: ['EXPERIMENTAL_AI', 'ADVANCED_SKILLS'],
  debug: ['DEBUG_MODE', 'VERBOSE_LOGGING']
}

// Export API
export {
  // Core functions
  isEnabled,
  getFlag,
  getAllFlags,
  setFlag,
  enable,
  disable,
  toggle,
  requireFlag,
  shouldLoadSkill,
  refreshFlags,
  initializeFeatureFlags,
  watchConfigFiles,
  
  // Constants
  FLAG_CATEGORIES,
  
  // Types
  FeatureFlagValue,
  FeatureFlagsConfig
}

// Default export
export default {
  isEnabled,
  getFlag,
  getAllFlags,
  enable,
  disable,
  toggle,
  requireFlag,
  shouldLoadSkill,
  initializeFeatureFlags
}
