/**
 * Void Bastion Defense - Steam Stats Manager
 * Tracks global statistics and player progression
 * Glory to the Emperor! ⚔️
 */

import { EventEmitter } from 'events';

// Player stats
export interface PlayerStats {
  kills: number;
  wavesCompleted: number;
  towersBuilt: number;
  gamesPlayed: number;
  totalPlayTime: number; // in seconds
  highestWave: number;
  totalScore: number;
  favoriteWeapon: string;
  bossesDefeated: number;
  elitesKilled: number;
}

// Global stats from Steam
export interface GlobalStats {
  totalKills: number;
  totalWavesCompleted: number;
  totalTowersBuilt: number;
  totalGamesPlayed: number;
  mostPopularWeapon: string;
  highestWaveEver: number;
  activePlayers: number;
}

// Stat update
export interface StatUpdate {
  stat: string;
  oldValue: number;
  newValue: number;
  delta: number;
}

/**
 * Stats Manager
 * Handles player and global statistics
 */
export class StatsManager extends EventEmitter {
  private static instance: StatsManager;
  private isInitialized: boolean = false;
  private greenworks: any = null;
  private steamId: string | null = null;

  // Local stats cache
  private playerStats: PlayerStats = {
    kills: 0,
    wavesCompleted: 0,
    towersBuilt: 0,
    gamesPlayed: 0,
    totalPlayTime: 0,
    highestWave: 0,
    totalScore: 0,
    favoriteWeapon: 'none',
    bossesDefeated: 0,
    elitesKilled: 0
  };

  // Global stats cache
  private globalStats: GlobalStats = {
    totalKills: 0,
    totalWavesCompleted: 0,
    totalTowersBuilt: 0,
    totalGamesPlayed: 0,
    mostPopularWeapon: 'none',
    highestWaveEver: 0,
    activePlayers: 0
  };

  // Session tracking
  private sessionStartTime: number = 0;
  private weaponKills: Map<string, number> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): StatsManager {
    if (!StatsManager.instance) {
      StatsManager.instance = new StatsManager();
    }
    return StatsManager.instance;
  }

  /**
   * Initialize stats manager
   */
  async initialize(greenworks: any, steamId: string | null): Promise<boolean> {
    if (this.isInitialized) return true;

    this.greenworks = greenworks;
    this.steamId = steamId;

    // Start session tracking
    this.sessionStartTime = Date.now();

    // Load saved stats
    await this.loadPlayerStats();

    this.isInitialized = true;
    this.emit('initialized');
    
    console.log('[Stats] Initialized');
    return true;
  }

  /**
   * Load player stats from Steam/local
   */
  private async loadPlayerStats(): Promise<void> {
    if (this.greenworks && this.steamId) {
      try {
        // Load from Steam
        this.playerStats.kills = this.greenworks.getStat('stat_kills') || 0;
        this.playerStats.wavesCompleted = this.greenworks.getStat('stat_waves_completed') || 0;
        this.playerStats.towersBuilt = this.greenworks.getStat('stat_towers_built') || 0;
        this.playerStats.gamesPlayed = this.greenworks.getStat('stat_games_played') || 0;
        this.playerStats.totalPlayTime = this.greenworks.getStat('stat_playtime') || 0;
        this.playerStats.highestWave = this.greenworks.getStat('stat_highest_wave') || 0;
        this.playerStats.bossesDefeated = this.greenworks.getStat('stat_bosses') || 0;
        this.playerStats.elitesKilled = this.greenworks.getStat('stat_elites') || 0;
      } catch (e) {
        console.log('[Stats] Failed to load Steam stats, using local');
        await this.loadLocalStats();
      }
    } else {
      await this.loadLocalStats();
    }

    this.emit('statsLoaded', { ...this.playerStats });
  }

  /**
   * Load stats from local storage
   */
  private async loadLocalStats(): Promise<void> {
    try {
      // In a real implementation, this would load from localStorage/file
      // For now, start fresh
      console.log('[Stats] Starting with fresh local stats');
    } catch (e) {
      console.error('[Stats] Failed to load local stats:', e);
    }
  }

  /**
   * Save player stats
   */
  async savePlayerStats(): Promise<boolean> {
    const success = await this.syncToSteam();
    
    if (success) {
      this.emit('statsSaved', { ...this.playerStats });
    }
    
    return success;
  }

  /**
   * Sync stats to Steam
   */
  private async syncToSteam(): Promise<boolean> {
    if (!this.greenworks) return false;

    try {
      this.greenworks.setStat('stat_kills', this.playerStats.kills);
      this.greenworks.setStat('stat_waves_completed', this.playerStats.wavesCompleted);
      this.greenworks.setStat('stat_towers_built', this.playerStats.towersBuilt);
      this.greenworks.setStat('stat_games_played', this.playerStats.gamesPlayed);
      this.greenworks.setStat('stat_playtime', this.playerStats.totalPlayTime);
      this.greenworks.setStat('stat_highest_wave', this.playerStats.highestWave);
      this.greenworks.setStat('stat_bosses', this.playerStats.bossesDefeated);
      this.greenworks.setStat('stat_elites', this.playerStats.elitesKilled);

      return this.greenworks.storeStats();
    } catch (e) {
      console.error('[Stats] Failed to sync to Steam:', e);
      return false;
    }
  }

  /**
   * Track kill
   */
  trackKill(weaponType: string = 'unknown'): void {
    const oldValue = this.playerStats.kills;
    this.playerStats.kills++;
    
    // Track weapon kills
    const current = this.weaponKills.get(weaponType) || 0;
    this.weaponKills.set(weaponType, current + 1);

    // Update favorite weapon
    this.updateFavoriteWeapon();

    this.emit('statUpdated', {
      stat: 'kills',
      oldValue,
      newValue: this.playerStats.kills,
      delta: 1
    } as StatUpdate);
  }

  /**
   * Track elite kill
   */
  trackEliteKill(): void {
    this.playerStats.elitesKilled++;
    this.trackKill('elite');
  }

  /**
   * Track boss defeat
   */
  trackBossDefeated(): void {
    const oldValue = this.playerStats.bossesDefeated;
    this.playerStats.bossesDefeated++;
    this.trackKill('boss');
    
    this.emit('statUpdated', {
      stat: 'bossesDefeated',
      oldValue,
      newValue: this.playerStats.bossesDefeated,
      delta: 1
    } as StatUpdate);
  }

  /**
   * Track wave completion
   */
  trackWaveCompleted(wave: number): void {
    const oldValue = this.playerStats.wavesCompleted;
    this.playerStats.wavesCompleted++;

    // Update highest wave
    if (wave > this.playerStats.highestWave) {
      this.playerStats.highestWave = wave;
      this.emit('statUpdated', {
        stat: 'highestWave',
        oldValue: this.playerStats.highestWave - 1,
        newValue: wave,
        delta: 1
      } as StatUpdate);
    }

    this.emit('statUpdated', {
      stat: 'wavesCompleted',
      oldValue,
      newValue: this.playerStats.wavesCompleted,
      delta: 1
    } as StatUpdate);

    // Sync periodically
    if (this.playerStats.wavesCompleted % 10 === 0) {
      this.savePlayerStats();
    }
  }

  /**
   * Track tower build
   */
  trackTowerBuilt(towerType: string): void {
    const oldValue = this.playerStats.towersBuilt;
    this.playerStats.towersBuilt++;
    
    this.emit('statUpdated', {
      stat: 'towersBuilt',
      oldValue,
      newValue: this.playerStats.towersBuilt,
      delta: 1
    } as StatUpdate);
  }

  /**
   * Track game played
   */
  trackGamePlayed(): void {
    const oldValue = this.playerStats.gamesPlayed;
    this.playerStats.gamesPlayed++;
    
    this.emit('statUpdated', {
      stat: 'gamesPlayed',
      oldValue,
      newValue: this.playerStats.gamesPlayed,
      delta: 1
    } as StatUpdate);

    this.savePlayerStats();
  }

  /**
   * Update total score
   */
  addScore(points: number): void {
    this.playerStats.totalScore += points;
    
    this.emit('statUpdated', {
      stat: 'totalScore',
      oldValue: this.playerStats.totalScore - points,
      newValue: this.playerStats.totalScore,
      delta: points
    } as StatUpdate);
  }

  /**
   * Update favorite weapon based on kills
   */
  private updateFavoriteWeapon(): void {
    let maxKills = 0;
    let favorite = 'none';

    this.weaponKills.forEach((kills, weapon) => {
      if (kills > maxKills) {
        maxKills = kills;
        favorite = weapon;
      }
    });

    if (favorite !== this.playerStats.favoriteWeapon) {
      const oldValue = this.playerStats.favoriteWeapon;
      this.playerStats.favoriteWeapon = favorite;
      
      this.emit('statUpdated', {
        stat: 'favoriteWeapon',
        oldValue,
        newValue: favorite,
        delta: 0
      } as StatUpdate);
    }
  }

  /**
   * Get current session duration
   */
  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Update play time
   */
  updatePlayTime(): void {
    const sessionDuration = this.getSessionDuration();
    this.playerStats.totalPlayTime += sessionDuration;
    
    // Reset session timer
    this.sessionStartTime = Date.now();
  }

  /**
   * Get player stats
   */
  getPlayerStats(): PlayerStats {
    return { ...this.playerStats };
  }

  /**
   * Get global stats
   */
  async getGlobalStats(): Promise<GlobalStats | null> {
    if (!this.greenworks) return null;

    try {
      const stats = await new Promise<any>((resolve) => {
        this.greenworks.getGlobalStats(
          ['stat_kills', 'stat_waves_completed', 'stat_towers_built', 'stat_highest_wave'],
          100,
          (result: any) => resolve(result)
        );
      });

      if (stats) {
        this.globalStats = {
          totalKills: stats.stat_kills || 0,
          totalWavesCompleted: stats.stat_waves_completed || 0,
          totalTowersBuilt: stats.stat_towers_built || 0,
          totalGamesPlayed: 0, // Not tracked globally
          mostPopularWeapon: 'unknown', // Would need additional query
          highestWaveEver: stats.stat_highest_wave || 0,
          activePlayers: 0 // Would need additional API
        };
      }

      return { ...this.globalStats };
    } catch (e) {
      console.error('[Stats] Failed to get global stats:', e);
      return null;
    }
  }

  /**
   * Get weapon breakdown
   */
  getWeaponBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    this.weaponKills.forEach((kills, weapon) => {
      breakdown[weapon] = kills;
    });
    return breakdown;
  }

  /**
   * Get stats summary
   */
  getStatsSummary(): {
    player: PlayerStats;
    sessionDuration: number;
    weaponBreakdown: Record<string, number>;
  } {
    return {
      player: this.getPlayerStats(),
      sessionDuration: this.getSessionDuration(),
      weaponBreakdown: this.getWeaponBreakdown()
    };
  }

  /**
   * Reset stats (for testing)
   */
  async resetStats(): Promise<void> {
    this.playerStats = {
      kills: 0,
      wavesCompleted: 0,
      towersBuilt: 0,
      gamesPlayed: 0,
      totalPlayTime: 0,
      highestWave: 0,
      totalScore: 0,
      favoriteWeapon: 'none',
      bossesDefeated: 0,
      elitesKilled: 0
    };

    this.weaponKills.clear();
    this.sessionStartTime = Date.now();

    await this.savePlayerStats();
    this.emit('statsReset');
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.updatePlayTime();
    await this.savePlayerStats();
    
    this.isInitialized = false;
    console.log('[Stats] Shutdown complete');
  }
}

// Export singleton
export const statsManager = StatsManager.getInstance();
export default statsManager;
