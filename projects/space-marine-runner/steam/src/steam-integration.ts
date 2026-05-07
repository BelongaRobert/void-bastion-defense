/**
 * Void Bastion Defense - Steam Integration
 * The Steam Lord's domain - blessed by the Emperor
 * 
 * Manages Steamworks features via Greenworks wrapper
 */

import { EventEmitter } from 'events';

// Achievement definition interface
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  hidden: boolean;
  progress?: {
    current: number;
    max: number;
  };
}

// Steam stats interface
export interface SteamStats {
  kills: number;
  wavesCompleted: number;
  towersBuilt: number;
  gamesPlayed: number;
  totalPlayTime: number;
  favoriteWeapon: string;
}

// Leaderboard entry interface
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  details?: string;
}

// Cloud save data interface
export interface CloudSaveData {
  timestamp: number;
  version: string;
  playerData: any;
  checksum: string;
}

/**
 * Steam Integration Manager
 * Handles all Steamworks functionality
 */
export class SteamIntegration extends EventEmitter {
  private static instance: SteamIntegration;
  private isInitialized: boolean = false;
  private isSteamRunning: boolean = false;
  private achievements: Map<string, Achievement> = new Map();
  private stats: SteamStats = {
    kills: 0,
    wavesCompleted: 0,
    towersBuilt: 0,
    gamesPlayed: 0,
    totalPlayTime: 0,
    favoriteWeapon: ''
  };

  // Greenworks module (loaded dynamically)
  private greenworks: any = null;

  // Rich presence update timer
  private richPresenceTimer: NodeJS.Timeout | null = null;

  private constructor() {
    super();
  }

  static getInstance(): SteamIntegration {
    if (!SteamIntegration.instance) {
      SteamIntegration.instance = new SteamIntegration();
    }
    return SteamIntegration.instance;
  }

  /**
   * Initialize Steam integration
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.isSteamRunning;
    }

    try {
      // Try to load Greenworks
      this.greenworks = await this.loadGreenworks();
      
      if (!this.greenworks) {
        console.log('[Steam] Greenworks not available - running in standalone mode');
        this.emit('standalone');
        this.isInitialized = true;
        return false;
      }

      // Initialize Steam
      const initialized = this.greenworks.init();
      
      if (!initialized) {
        console.log('[Steam] Steam not running - standalone mode');
        this.emit('standalone');
        this.isInitialized = true;
        return false;
      }

      this.isSteamRunning = true;
      this.isInitialized = true;

      // Set up event handlers
      this.setupEventHandlers();
      
      // Load achievements
      this.loadAchievements();
      
      // Request stats
      this.requestStats();

      console.log('[Steam] Successfully initialized - Steam ID:', this.getSteamId());
      this.emit('initialized', this.getSteamId());

      return true;
    } catch (error) {
      console.error('[Steam] Initialization error:', error);
      this.emit('standalone');
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Load Greenworks module
   */
  private async loadGreenworks(): Promise<any> {
    try {
      // In Electron environment
      if (process.versions.electron) {
        const greenworks = require('greenworks');
        return greenworks;
      }
    } catch (e) {
      console.log('[Steam] Greenworks not found');
    }
    return null;
  }

  /**
   * Set up Steam event handlers
   */
  private setupEventHandlers(): void {
    if (!this.greenworks) return;

    // Achievement unlocked
    this.greenworks.on('achievement-unlocked', (achievementId: string) => {
      console.log('[Steam] Achievement unlocked:', achievementId);
      this.emit('achievementUnlocked', achievementId);
    });

    // User stats stored
    this.greenworks.on('user-stats-stored', () => {
      console.log('[Steam] User stats stored');
      this.emit('statsStored');
    });

    // Game overlay activated
    this.greenworks.on('game-overlay-activated', (active: boolean) => {
      console.log('[Steam] Overlay active:', active);
      this.emit('overlayActivated', active);
    });
  }

  /**
   * Get Steam ID
   */
  getSteamId(): string | null {
    if (!this.greenworks || !this.isSteamRunning) return null;
    try {
      return this.greenworks.getSteamId();
    } catch (e) {
      return null;
    }
  }

  /**
   * Get Steam username
   */
  getUserName(): string {
    if (!this.greenworks || !this.isSteamRunning) return 'Commander';
    try {
      return this.greenworks.getUserName();
    } catch (e) {
      return 'Commander';
    }
  }

  /**
   * Set rich presence
   */
  setRichPresence(status: string, details?: Record<string, string>): void {
    if (!this.greenworks || !this.isSteamRunning) return;

    try {
      this.greenworks.setRichPresence('steam_display', status);
      
      if (details) {
        Object.entries(details).forEach(([key, value]) => {
          this.greenworks.setRichPresence(key, value);
        });
      }
    } catch (e) {
      console.error('[Steam] Failed to set rich presence:', e);
    }
  }

  /**
   * Start rich presence updates for gameplay
   */
  startRichPresenceUpdates(wave: number, score: number): void {
    this.setRichPresence('#WaveStatus', {
      wave: wave.toString(),
      score: score.toString()
    });

    // Update every 30 seconds
    this.richPresenceTimer = setInterval(() => {
      this.setRichPresence('#WaveStatus', {
        wave: wave.toString(),
        score: score.toString()
      });
    }, 30000);
  }

  /**
   * Stop rich presence updates
   */
  stopRichPresenceUpdates(): void {
    if (this.richPresenceTimer) {
      clearInterval(this.richPresenceTimer);
      this.richPresenceTimer = null;
    }
  }

  /**
   * Load achievement definitions
   */
  private loadAchievements(): void {
    // Achievement definitions from Phase 2
    const achievementDefs: Achievement[] = [
      // Tutorial & First Steps (5)
      { id: 'ACH_FIRST_BLOOD', name: 'First Blood', description: 'Defeat your first enemy', icon: 'ach_first_blood', hidden: false },
      { id: 'ACH_TUTORIAL_COMPLETE', name: 'Graduate', description: 'Complete the tutorial', icon: 'ach_graduate', hidden: false },
      { id: 'ACH_FIRST_WAVE', name: 'First Wave', description: 'Complete your first wave', icon: 'ach_first_wave', hidden: false },
      { id: 'ACH_FIRST_BUILD', name: 'Architect', description: 'Build your first tower', icon: 'ach_architect', hidden: false },
      { id: 'ACH_FIRST_UPGRADE', name: 'Engineer', description: 'Upgrade a tower for the first time', icon: 'ach_engineer', hidden: false },

      // Wave Milestones (6)
      { id: 'ACH_WAVE_10', name: 'Wave 10 Survivor', description: 'Reach wave 10', icon: 'ach_wave_10', hidden: false },
      { id: 'ACH_WAVE_25', name: 'Wave 25 Veteran', description: 'Reach wave 25', icon: 'ach_wave_25', hidden: false },
      { id: 'ACH_WAVE_50', name: 'Wave 50 Elite', description: 'Reach wave 50', icon: 'ach_wave_50', hidden: false },
      { id: 'ACH_WAVE_75', name: 'Wave 75 Master', description: 'Reach wave 75', icon: 'ach_wave_75', hidden: false },
      { id: 'ACH_WAVE_100', name: 'Centurion', description: 'Reach wave 100', icon: 'ach_centurion', hidden: false },
      { id: 'ACH_WAVE_150', name: 'Immortal', description: 'Reach wave 150', icon: 'ach_immortal', hidden: false },

      // Tower Mastery (5)
      { id: 'ACH_TOWER_ALL', name: 'Tower Master', description: 'Build every tower type', icon: 'ach_tower_master', hidden: false },
      { id: 'ACH_TOWER_MAX', name: 'Maxed Out', description: 'Max upgrade a tower', icon: 'ach_maxed_out', hidden: false },
      { id: 'ACH_SNIPER_KILLS', name: 'Long Shot', description: 'Get 1000 kills with sniper towers', icon: 'ach_long_shot', hidden: false, progress: { current: 0, max: 1000 } },
      { id: 'ACH_AOE_KILLS', name: 'Crowd Control', description: 'Get 500 multi-kills with AoE towers', icon: 'ach_crowd_control', hidden: false, progress: { current: 0, max: 500 } },
      { id: 'ACH_TOWER_SELL', name: 'Tactical Retreat', description: 'Sell 50 towers', icon: 'ach_tactical_retreat', hidden: false, progress: { current: 0, max: 50 } },

      // Enemy Kills (5)
      { id: 'ACH_KILLS_100', name: 'Hundred Slayer', description: 'Defeat 100 enemies', icon: 'ach_hundred_slayer', hidden: false, progress: { current: 0, max: 100 } },
      { id: 'ACH_KILLS_1000', name: 'Thousand Slayer', description: 'Defeat 1000 enemies', icon: 'ach_thousand_slayer', hidden: false, progress: { current: 0, max: 1000 } },
      { id: 'ACH_KILLS_10000', name: 'Ten Thousand Slayer', description: 'Defeat 10,000 enemies', icon: 'ach_10000_slayer', hidden: false, progress: { current: 0, max: 10000 } },
      { id: 'ACH_BOSS_KILLS', name: 'Boss Hunter', description: 'Defeat 25 bosses', icon: 'ach_boss_hunter', hidden: false, progress: { current: 0, max: 25 } },
      { id: 'ACH_ELITE_KILLS', name: 'Elite Slayer', description: 'Defeat 100 elite enemies', icon: 'ach_elite_slayer', hidden: false, progress: { current: 0, max: 100 } },

      // Economy & Strategy (5)
      { id: 'ACH_RICH', name: 'War Chest', description: 'Accumulate 10,000 credits', icon: 'ach_war_chest', hidden: false },
      { id: 'ACH_NO_DAMAGE', name: 'Perfect Defense', description: 'Complete a wave with 0 damage to the Bastion', icon: 'ach_perfect_defense', hidden: false },
      { id: 'ACH_NO_TOWERS', name: 'Minimalist', description: 'Complete wave 5 with only 3 towers', icon: 'ach_minimalist', hidden: false },
      { id: 'ACH_ALL_TOWERS', name: 'Full Arsenal', description: 'Have 20+ towers active at once', icon: 'ach_full_arsenal', hidden: false },
      { id: 'ACH_EFFICIENT', name: 'Efficient Killer', description: 'Complete wave 10 spending less than 5000 credits', icon: 'ach_efficient', hidden: false },

      // Secret Achievements (4)
      { id: 'ACH_SECRET_TYRANID', name: 'Xenos Scum', description: 'Defeat a Tyranid boss', icon: 'ach_xenos_scum', hidden: true },
      { id: 'ACH_SECRET_CHAOS', name: 'Heretic', description: 'Defeat a Chaos Marine boss', icon: 'ach_heretic', hidden: true },
      { id: 'ACH_SECRET_NECRON', name: 'Ancient Evil', description: 'Defeat a Necron boss', icon: 'ach_ancient_evil', hidden: true },
      { id: 'ACH_SECRET_EMPEROR', name: 'For the Emperor!', description: '???', icon: 'ach_for_emperor', hidden: true }
    ];

    achievementDefs.forEach(ach => {
      this.achievements.set(ach.id, ach);
    });
  }

  /**
   * Unlock an achievement
   */
  unlockAchievement(achievementId: string): boolean {
    if (!this.greenworks || !this.isSteamRunning) {
      console.log(`[Steam] Achievement unlocked (standalone): ${achievementId}`);
      this.emit('achievementUnlocked', achievementId);
      return false;
    }

    try {
      const success = this.greenworks.activateAchievement(achievementId);
      if (success) {
        console.log(`[Steam] Achievement unlocked: ${achievementId}`);
        this.emit('achievementUnlocked', achievementId);
        
        // Show notification
        this.showAchievementNotification(achievementId);
      }
      return success;
    } catch (e) {
      console.error('[Steam] Failed to unlock achievement:', e);
      return false;
    }
  }

  /**
   * Show achievement notification popup
   */
  private showAchievementNotification(achievementId: string): void {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return;

    // Emit event for UI to display
    this.emit('showNotification', {
      type: 'achievement',
      title: 'Achievement Unlocked!',
      achievement: achievement
    });
  }

  /**
   * Update achievement progress
   */
  updateAchievementProgress(achievementId: string, current: number, max: number): void {
    if (!this.greenworks || !this.isSteamRunning) return;

    try {
      this.greenworks.setAchievementProgress(achievementId, current, max);
    } catch (e) {
      console.error('[Steam] Failed to update achievement progress:', e);
    }
  }

  /**
   * Get all achievements
   */
  getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): string[] {
    if (!this.greenworks || !this.isSteamRunning) return [];
    
    try {
      return this.greenworks.getAchievements();
    } catch (e) {
      return [];
    }
  }

  /**
   * Request user stats from Steam
   */
  requestStats(): boolean {
    if (!this.greenworks || !this.isSteamRunning) return false;

    try {
      return this.greenworks.requestCurrentStats();
    } catch (e) {
      console.error('[Steam] Failed to request stats:', e);
      return false;
    }
  }

  /**
   * Set a stat value
   */
  setStat(statName: string, value: number): void {
    if (!this.greenworks || !this.isSteamRunning) return;

    try {
      this.greenworks.setStat(statName, value);
    } catch (e) {
      console.error('[Steam] Failed to set stat:', e);
    }
  }

  /**
   * Get a stat value
   */
  getStat(statName: string): number {
    if (!this.greenworks || !this.isSteamRunning) return 0;

    try {
      return this.greenworks.getStat(statName);
    } catch (e) {
      return 0;
    }
  }

  /**
   * Increment a stat
   */
  incrementStat(statName: string, amount: number = 1): void {
    const current = this.getStat(statName);
    this.setStat(statName, current + amount);
  }

  /**
   * Store stats to Steam
   */
  storeStats(): boolean {
    if (!this.greenworks || !this.isSteamRunning) return false;

    try {
      return this.greenworks.storeStats();
    } catch (e) {
      console.error('[Steam] Failed to store stats:', e);
      return false;
    }
  }

  /**
   * Track game kill
   */
  trackKill(weaponType?: string): void {
    this.incrementStat('stat_kills');
    
    if (weaponType) {
      // Track weapon-specific kills
      this.incrementStat(`stat_kills_${weaponType}`);
    }
    
    this.storeStats();
  }

  /**
   * Track wave completion
   */
  trackWaveComplete(wave: number): void {
    this.incrementStat('stat_waves_completed');
    
    const currentHigh = this.getStat('stat_highest_wave');
    if (wave > currentHigh) {
      this.setStat('stat_highest_wave', wave);
    }
    
    this.storeStats();
  }

  /**
   * Track tower build
   */
  trackTowerBuild(): void {
    this.incrementStat('stat_towers_built');
    this.storeStats();
  }

  /**
   * Update favorite weapon stat
   */
  updateFavoriteWeapon(): void {
    // Check all weapon stats and update favorite
    const weapons = ['sniper', 'cannon', 'laser', 'missile', 'aoe'];
    let favorite = '';
    let maxKills = 0;

    weapons.forEach(weapon => {
      const kills = this.getStat(`stat_kills_${weapon}`);
      if (kills > maxKills) {
        maxKills = kills;
        favorite = weapon;
      }
    });

    // Set favorite weapon (stored as string value)
    this.setStat('stat_favorite_weapon', favorite ? favorite.charCodeAt(0) : 0);
  }

  /**
   * Get all global stats
   */
  getGlobalStats(): Promise<any> {
    if (!this.greenworks || !this.isSteamRunning) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        this.greenworks.getGlobalStats(['stat_kills', 'stat_waves_completed', 'stat_towers_built'], 1, (stats: any) => {
          resolve(stats);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Check if Steam is running
   */
  isRunning(): boolean {
    return this.isSteamRunning;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Activate Steam overlay
   */
  activateOverlay(option?: string): void {
    if (!this.greenworks || !this.isSteamRunning) return;

    try {
      this.greenworks.activateGameOverlay(option || 'Friends');
    } catch (e) {
      console.error('[Steam] Failed to activate overlay:', e);
    }
  }

  /**
   * Shutdown Steam integration
   */
  shutdown(): void {
    this.stopRichPresenceUpdates();
    this.storeStats();
    this.isInitialized = false;
    this.isSteamRunning = false;
    console.log('[Steam] Shutdown complete');
  }
}

// Export singleton
export const steamIntegration = SteamIntegration.getInstance();
export default steamIntegration;
