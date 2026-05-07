/**
 * Void Bastion Defense - Steam Integration Index
 * Export all Steam modules
 */

export { steamIntegration, SteamIntegration, Achievement, SteamStats, LeaderboardEntry } from './steam-integration';
export { cloudSaveManager, CloudSaveManager, CloudSaveData, SaveMetadata } from './cloud-save';
export { leaderboardManager, LeaderboardManager, LeaderboardEntry as LBEntry, LeaderboardDef, WeeklyChallenge } from './leaderboards';
export { statsManager, StatsManager, PlayerStats, GlobalStats, StatUpdate } from './stats-manager';
export {
  initializeSteamElectron,
  shutdownSteamElectron,
  createSteamWindow,
  savePreloadScript,
  getPreloadScript,
  isSteamMode,
  isStandalone
} from './electron-wrapper';

// Preload script
export { default as preloadScript } from './steam-preload';

// Default export
export { default } from './steam-integration';
