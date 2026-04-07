/**
 * Void Bastion Defense - Steam Leaderboards Manager
 * Global and Friends leaderboards with weekly challenges
 * For the Emperor! ⚔️
 */

import { EventEmitter } from 'events';

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  steamId: string;
  score: number;
  details: string;
  globalRank?: number;
}

// Leaderboard type
export type LeaderboardType = 'global' | 'friends' | 'around_user';

// Leaderboard definition
export interface LeaderboardDef {
  name: string;
  displayName: string;
  sortMethod: 'ascending' | 'descending';
  displayType: 'numeric' | 'timeSeconds' | 'timeMilliseconds';
}

// Weekly challenge
export interface WeeklyChallenge {
  id: string;
  name: string;
  description: string;
  leaderboardName: string;
  startDate: number;
  endDate: number;
  rules: ChallengeRules;
}

// Challenge rules
export interface ChallengeRules {
  maxTowers?: number;
  allowedTowers?: string[];
  bannedTowers?: string[];
  modifiers: string[];
}

// Score validation result
export interface ScoreValidation {
  valid: boolean;
  reason?: string;
  confidence: number;
}

/**
 * Leaderboard Manager
 * Handles Steam leaderboards and weekly challenges
 */
export class LeaderboardManager extends EventEmitter {
  private static instance: LeaderboardManager;
  private isInitialized: boolean = false;
  private greenworks: any = null;
  private steamId: string | null = null;

  // Leaderboard handles cache
  private leaderboards: Map<string, any> = new Map();
  
  // Current challenge
  private currentChallenge: WeeklyChallenge | null = null;

  // Leaderboard definitions
  private readonly LEADERBOARDS: LeaderboardDef[] = [
    {
      name: 'LB_HIGH_WAVE',
      displayName: 'Highest Wave Reached',
      sortMethod: 'descending',
      displayType: 'numeric'
    },
    {
      name: 'LB_TOTAL_KILLS',
      displayName: 'Total Kills',
      sortMethod: 'descending',
      displayType: 'numeric'
    },
    {
      name: 'LB_WAVE_SPEED',
      displayName: 'Fastest Wave 50',
      sortMethod: 'ascending',
      displayType: 'timeMilliseconds'
    },
    {
      name: 'LB_CHALLENGE_SCORE',
      displayName: 'Challenge Score',
      sortMethod: 'descending',
      displayType: 'numeric'
    },
    {
      name: 'LB_WEEKLY_CHALLENGE',
      displayName: 'Weekly Challenge',
      sortMethod: 'descending',
      displayType: 'numeric'
    }
  ];

  private constructor() {
    super();
  }

  static getInstance(): LeaderboardManager {
    if (!LeaderboardManager.instance) {
      LeaderboardManager.instance = new LeaderboardManager();
    }
    return LeaderboardManager.instance;
  }

  /**
   * Initialize leaderboards
   */
  async initialize(greenworks: any, steamId: string): Promise<boolean> {
    if (this.isInitialized) return true;

    this.greenworks = greenworks;
    this.steamId = steamId;

    if (!this.greenworks) {
      console.log('[Leaderboards] Steam not available - leaderboards disabled');
      this.emit('disabled');
      return false;
    }

    // Load all leaderboard handles
    await this.loadLeaderboards();

    // Initialize weekly challenge
    this.initializeWeeklyChallenge();

    this.isInitialized = true;
    this.emit('initialized');
    
    console.log('[Leaderboards] Initialized');
    return true;
  }

  /**
   * Load leaderboard handles from Steam
   */
  private async loadLeaderboards(): Promise<void> {
    for (const def of this.LEADERBOARDS) {
      try {
        const handle = await this.getLeaderboardHandle(def.name);
        if (handle) {
          this.leaderboards.set(def.name, handle);
          console.log(`[Leaderboards] Loaded: ${def.name}`);
        }
      } catch (e) {
        console.error(`[Leaderboards] Failed to load ${def.name}:`, e);
      }
    }
  }

  /**
   * Get leaderboard handle from Steam
   */
  private async getLeaderboardHandle(name: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this.greenworks.getLeaderboard(name, 'Global', (handle: any, error: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(handle);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Initialize weekly challenge
   */
  private initializeWeeklyChallenge(): void {
    const now = Date.now();
    const weekStart = this.getWeekStart(now);
    const weekEnd = weekStart + (7 * 24 * 60 * 60 * 1000);

    this.currentChallenge = {
      id: `challenge_${weekStart}`,
      name: this.getChallengeName(weekStart),
      description: this.getChallengeDescription(weekStart),
      leaderboardName: 'LB_WEEKLY_CHALLENGE',
      startDate: weekStart,
      endDate: weekEnd,
      rules: this.getChallengeRules(weekStart)
    };

    this.emit('challengeUpdated', this.currentChallenge);
  }

  /**
   * Get week start timestamp
   */
  private getWeekStart(timestamp: number): number {
    const date = new Date(timestamp);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  /**
   * Generate challenge name based on week
   */
  private getChallengeName(weekStart: number): string {
    const challenges = [
      'Tower Limit Challenge',
      'Speed Run Challenge',
      'Only Snipers Challenge',
      'No Upgrades Challenge',
      'Minimalist Challenge',
      'Survival Challenge',
      'Elite Hunt Challenge',
      'Boss Rush Challenge'
    ];
    const index = Math.floor(weekStart / (7 * 24 * 60 * 60 * 1000)) % challenges.length;
    return challenges[index];
  }

  /**
   * Generate challenge description
   */
  private getChallengeDescription(weekStart: number): string {
    const names = this.getChallengeName(weekStart);
    
    const descriptions: Record<string, string> = {
      'Tower Limit Challenge': 'Reach the highest wave using only 5 towers!',
      'Speed Run Challenge': 'Complete wave 50 as fast as possible!',
      'Only Snipers Challenge': 'Use only Sniper Towers to reach the highest wave!',
      'No Upgrades Challenge': 'No tower upgrades allowed - pure skill!',
      'Minimalist Challenge': 'Beat wave 25 with only 3 towers!',
      'Survival Challenge': 'Survive as long as possible with limited resources!',
      'Elite Hunt Challenge': 'Defeat the most Elite enemies!',
      'Boss Rush Challenge': 'Defeat bosses to earn bonus points!'
    };

    return descriptions[names] || 'Test your skills!';
  }

  /**
   * Generate challenge rules
   */
  private getChallengeRules(weekStart: number): ChallengeRules {
    const name = this.getChallengeName(weekStart);
    
    const rules: Record<string, ChallengeRules> = {
      'Tower Limit Challenge': { maxTowers: 5, modifiers: ['tower_limit'] },
      'Speed Run Challenge': { modifiers: ['speed_run', 'timer'] },
      'Only Snipers Challenge': { allowedTowers: ['sniper'], modifiers: ['weapon_restriction'] },
      'No Upgrades Challenge': { modifiers: ['no_upgrades'] },
      'Minimalist Challenge': { maxTowers: 3, modifiers: ['minimalist'] },
      'Survival Challenge': { modifiers: ['survival_mode'] },
      'Elite Hunt Challenge': { modifiers: ['elite_focus'] },
      'Boss Rush Challenge': { modifiers: ['boss_rush'] }
    };

    return rules[name] || { modifiers: [] };
  }

  /**
   * Get global leaderboard entries
   */
  async getGlobalLeaderboard(
    leaderboardName: string = 'LB_HIGH_WAVE',
    start: number = 0,
    end: number = 10
  ): Promise<LeaderboardEntry[]> {
    const handle = this.leaderboards.get(leaderboardName);
    if (!handle) return [];

    return new Promise((resolve, reject) => {
      try {
        this.greenworks.getLeaderboardEntries(
          handle,
          start,
          end,
          'Global',
          (entries: any[], error: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(this.formatEntries(entries));
            }
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Get friends leaderboard
   */
  async getFriendsLeaderboard(
    leaderboardName: string = 'LB_HIGH_WAVE'
  ): Promise<LeaderboardEntry[]> {
    const handle = this.leaderboards.get(leaderboardName);
    if (!handle) return [];

    return new Promise((resolve, reject) => {
      try {
        this.greenworks.getLeaderboardEntries(
          handle,
          0,
          100,
          'Friends',
          (entries: any[], error: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(this.formatEntries(entries));
            }
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Get entries around current user
   */
  async getLeaderboardAroundUser(
    leaderboardName: string = 'LB_HIGH_WAVE',
    range: number = 5
  ): Promise<LeaderboardEntry[]> {
    const handle = this.leaderboards.get(leaderboardName);
    if (!handle) return [];

    return new Promise((resolve, reject) => {
      try {
        this.greenworks.getLeaderboardEntries(
          handle,
          -range,
          range,
          'Global',
          (entries: any[], error: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(this.formatEntries(entries));
            }
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Format leaderboard entries
   */
  private formatEntries(entries: any[]): LeaderboardEntry[] {
    if (!entries) return [];
    
    return entries.map((entry, index) => ({
      rank: entry.globalRank || index + 1,
      steamId: entry.steamId || 'unknown',
      score: entry.score,
      details: entry.details || '',
      globalRank: entry.globalRank
    }));
  }

  /**
   * Upload score to leaderboard
   */
  async uploadScore(
    leaderboardName: string,
    score: number,
    details?: string
  ): Promise<boolean> {
    // Validate score first
    const validation = this.validateScore(score, details);
    if (!validation.valid) {
      console.log('[Leaderboards] Score rejected:', validation.reason);
      this.emit('scoreRejected', validation);
      return false;
    }

    const handle = this.leaderboards.get(leaderboardName);
    if (!handle) return false;

    return new Promise((resolve) => {
      try {
        this.greenworks.uploadLeaderboardScore(
          handle,
          score,
          details || '',
          'KeepBest',
          (result: any, error: any) => {
            if (error) {
              console.error('[Leaderboards] Upload failed:', error);
              resolve(false);
            } else {
              console.log('[Leaderboards] Score uploaded:', score);
              this.emit('scoreUploaded', { leaderboard: leaderboardName, score });
              resolve(true);
            }
          }
        );
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Validate score for anti-cheat
   */
  validateScore(score: number, details?: string): ScoreValidation {
    // Basic validation
    if (score < 0) {
      return { valid: false, reason: 'Negative score', confidence: 1.0 };
    }

    if (score > 999999999) {
      return { valid: false, reason: 'Score exceeds maximum', confidence: 0.95 };
    }

    // Contextual validation based on score type
    if (details) {
      try {
        const data = JSON.parse(details);
        
        // Validate wave score
        if (data.wave) {
          if (data.wave > 1000) {
            return { valid: false, reason: 'Wave exceeds maximum', confidence: 0.9 };
          }
        }

        // Validate kill count
        if (data.kills) {
          if (data.kills > score * 100) {
            return { valid: false, reason: 'Kill count suspicious', confidence: 0.7 };
          }
        }

        // Validate play time
        if (data.playTime) {
          if (data.playTime < 0 || data.playTime > 999999) {
            return { valid: false, reason: 'Invalid play time', confidence: 0.9 };
          }
        }
      } catch (e) {
        // Details is not JSON, that's ok
      }
    }

    return { valid: true, confidence: 0.95 };
  }

  /**
   * Upload wave completion score
   */
  async uploadWaveScore(wave: number, kills: number, playTime: number): Promise<boolean> {
    const details = JSON.stringify({
      wave,
      kills,
      playTime,
      timestamp: Date.now()
    });

    return this.uploadScore('LB_HIGH_WAVE', wave, details);
  }

  /**
   * Upload weekly challenge score
   */
  async uploadChallengeScore(score: number, challengeId: string): Promise<boolean> {
    const details = JSON.stringify({
      challengeId,
      score,
      timestamp: Date.now()
    });

    return this.uploadScore('LB_WEEKLY_CHALLENGE', score, details);
  }

  /**
   * Get current weekly challenge
   */
  getCurrentChallenge(): WeeklyChallenge | null {
    return this.currentChallenge;
  }

  /**
   * Get time remaining in current challenge
   */
  getChallengeTimeRemaining(): number {
    if (!this.currentChallenge) return 0;
    return Math.max(0, this.currentChallenge.endDate - Date.now());
  }

  /**
   * Get leaderboard definitions
   */
  getLeaderboardDefinitions(): LeaderboardDef[] {
    return [...this.LEADERBOARDS];
  }

  /**
   * Get available leaderboards
   */
  getAvailableLeaderboards(): string[] {
    return Array.from(this.leaderboards.keys());
  }

  /**
   * Get user rank on a leaderboard
   */
  async getUserRank(leaderboardName: string): Promise<number | null> {
    const entries = await this.getLeaderboardAroundUser(leaderboardName, 0);
    const userEntry = entries.find(e => e.steamId === this.steamId);
    return userEntry?.rank || null;
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.isInitialized = false;
    this.leaderboards.clear();
    console.log('[Leaderboards] Shutdown complete');
  }
}

// Export singleton
export const leaderboardManager = LeaderboardManager.getInstance();
export default leaderboardManager;
