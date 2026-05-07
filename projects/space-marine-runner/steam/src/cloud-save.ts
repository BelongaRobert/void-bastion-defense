/**
 * Void Bastion Defense - Steam Cloud Save Manager
 * Auto-sync saves to Steam Cloud with conflict resolution
 * The Emperor protects your data! ⚔️
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

// Save file metadata
export interface SaveMetadata {
  filename: string;
  timestamp: number;
  version: string;
  checksum: string;
  size: number;
}

// Cloud save state
export interface CloudSaveState {
  local: SaveMetadata | null;
  remote: SaveMetadata | null;
  synced: boolean;
  conflict: boolean;
}

/**
 * Cloud Save Manager
 * Handles Steam Cloud synchronization
 */
export class CloudSaveManager extends EventEmitter {
  private static instance: CloudSaveManager;
  private isInitialized: boolean = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private greenworks: any = null;

  // Save file names
  private readonly SAVE_FILES = {
    PLAYER: 'player_save.json',
    SETTINGS: 'settings.json',
    ACHIEVEMENTS: 'achievements.json',
    STATS: 'player_stats.json'
  };

  private constructor() {
    super();
  }

  static getInstance(): CloudSaveManager {
    if (!CloudSaveManager.instance) {
      CloudSaveManager.instance = new CloudSaveManager();
    }
    return CloudSaveManager.instance;
  }

  /**
   * Initialize cloud save manager
   */
  async initialize(greenworks: any): Promise<boolean> {
    if (this.isInitialized) return true;

    this.greenworks = greenworks;
    
    if (!this.greenworks) {
      console.log('[CloudSave] Steam not available - cloud saves disabled');
      this.emit('disabled');
      return false;
    }

    this.isInitialized = true;
    console.log('[CloudSave] Initialized');
    
    // Check for existing cloud saves
    await this.checkCloudSaves();
    
    this.emit('initialized');
    return true;
  }

  /**
   * Check Steam Cloud availability
   */
  isCloudEnabled(): boolean {
    if (!this.greenworks) return false;
    
    try {
      return this.greenworks.isCloudEnabled();
    } catch (e) {
      return false;
    }
  }

  /**
   * Get cloud quota
   */
  getCloudQuota(): { used: number; total: number } | null {
    if (!this.greenworks) return null;
    
    try {
      return this.greenworks.getCloudQuota();
    } catch (e) {
      return null;
    }
  }

  /**
   * Check for cloud save conflicts
   */
  async checkCloudSaves(): Promise<CloudSaveState[]> {
    const states: CloudSaveState[] = [];

    for (const [, filename] of Object.entries(this.SAVE_FILES)) {
      const state = await this.getSaveState(filename);
      states.push(state);
    }

    // Emit conflict event if any conflicts found
    const hasConflicts = states.some(s => s.conflict);
    if (hasConflicts) {
      this.emit('conflictDetected', states.filter(s => s.conflict));
    }

    return states;
  }

  /**
   * Get save state for a file
   */
  private async getSaveState(filename: string): Promise<CloudSaveState> {
    const local = await this.getLocalSaveMetadata(filename);
    const remote = await this.getRemoteSaveMetadata(filename);

    const conflict = this.detectConflict(local, remote);
    const synced = local && remote && local.checksum === remote.checksum && !conflict;

    return { local, remote, synced, conflict };
  }

  /**
   * Detect save conflict
   * Conflict exists when both local and remote exist with different timestamps
   */
  private detectConflict(local: SaveMetadata | null, remote: SaveMetadata | null): boolean {
    if (!local || !remote) return false;
    if (local.checksum === remote.checksum) return false;
    
    // If timestamps differ by more than 5 minutes, it's a conflict
    const timeDiff = Math.abs(local.timestamp - remote.timestamp);
    return timeDiff > 300000;
  }

  /**
   * Get local save metadata
   */
  private async getLocalSaveMetadata(filename: string): Promise<SaveMetadata | null> {
    try {
      const data = await this.readLocalFile(filename);
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        filename,
        timestamp: parsed.timestamp || Date.now(),
        version: parsed.version || '1.0.0',
        checksum: this.calculateChecksum(data),
        size: data.length
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get remote (cloud) save metadata
   */
  private async getRemoteSaveMetadata(filename: string): Promise<SaveMetadata | null> {
    if (!this.greenworks) return null;

    try {
      const data = await this.readCloudFile(filename);
      if (!data) return null;

      const parsed = JSON.parse(data);
      return {
        filename,
        timestamp: parsed.timestamp || Date.now(),
        version: parsed.version || '1.0.0',
        checksum: this.calculateChecksum(data),
        size: data.length
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Save data to local file
   */
  private async writeLocalFile(filename: string, data: string): Promise<boolean> {
    try {
      // In Electron, use fs
      const fs = require('fs').promises;
      const path = require('path');
      const savePath = path.join(this.getSaveDirectory(), filename);
      
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, data, 'utf8');
      return true;
    } catch (e) {
      console.error('[CloudSave] Failed to write local file:', e);
      return false;
    }
  }

  /**
   * Read local file
   */
  private async readLocalFile(filename: string): Promise<string | null> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const savePath = path.join(this.getSaveDirectory(), filename);
      
      const data = await fs.readFile(savePath, 'utf8');
      return data;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get save directory path
   */
  private getSaveDirectory(): string {
    const path = require('path');
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'saves');
  }

  /**
   * Write to Steam Cloud
   */
  private async writeCloudFile(filename: string, data: string): Promise<boolean> {
    if (!this.greenworks) return false;

    try {
      return this.greenworks.saveTextToFile(filename, data);
    } catch (e) {
      console.error('[CloudSave] Failed to write cloud file:', e);
      return false;
    }
  }

  /**
   * Read from Steam Cloud
   */
  private async readCloudFile(filename: string): Promise<string | null> {
    if (!this.greenworks) return null;

    try {
      return this.greenworks.readTextFromFile(filename);
    } catch (e) {
      return null;
    }
  }

  /**
   * Save player data with cloud sync
   */
  async savePlayerData(data: any, options?: { backup?: boolean }): Promise<boolean> {
    const saveData = {
      ...data,
      timestamp: Date.now(),
      version: '1.0.0',
      checksum: '' // Will be calculated
    };

    const jsonData = JSON.stringify(saveData, null, 2);
    saveData.checksum = this.calculateChecksum(jsonData);

    // Save locally first
    const localSuccess = await this.writeLocalFile(this.SAVE_FILES.PLAYER, JSON.stringify(saveData, null, 2));
    
    if (!localSuccess) {
      this.emit('saveFailed', 'local');
      return false;
    }

    // Sync to cloud if available
    if (this.isCloudEnabled()) {
      const cloudSuccess = await this.writeCloudFile(
        this.SAVE_FILES.PLAYER, 
        JSON.stringify(saveData, null, 2)
      );
      
      if (!cloudSuccess) {
        this.emit('cloudSyncFailed');
        return false;
      }

      // Create backup if requested
      if (options?.backup) {
        await this.createBackup(saveData);
      }
    }

    this.emit('saved', { type: 'player', timestamp: saveData.timestamp });
    return true;
  }

  /**
   * Load player data with conflict resolution
   */
  async loadPlayerData(): Promise<any | null> {
    const state = await this.getSaveState(this.SAVE_FILES.PLAYER);

    if (state.conflict) {
      // Resolve conflict - newest wins
      const winner = await this.resolveConflict(state);
      this.emit('conflictResolved', { winner: winner === 'local' ? 'local' : 'remote' });
      
      if (winner === 'local') {
        return this.loadLocalData(this.SAVE_FILES.PLAYER);
      } else {
        return this.loadRemoteData(this.SAVE_FILES.PLAYER);
      }
    }

    // No conflict, prefer local (faster)
    let data = await this.loadLocalData(this.SAVE_FILES.PLAYER);
    
    if (!data && state.remote) {
      // No local save, download from cloud
      data = await this.loadRemoteData(this.SAVE_FILES.PLAYER);
      
      if (data) {
        // Cache locally
        await this.writeLocalFile(this.SAVE_FILES.PLAYER, JSON.stringify(data, null, 2));
      }
    }

    return data;
  }

  /**
   * Resolve save conflict
   * Newest timestamp wins
   */
  private async resolveConflict(state: CloudSaveState): Promise<'local' | 'remote'> {
    if (!state.local) return 'remote';
    if (!state.remote) return 'local';

    // Newest wins
    const winner = state.local.timestamp >= state.remote.timestamp ? 'local' : 'remote';
    
    console.log(`[CloudSave] Conflict resolved: ${winner} wins (local: ${state.local.timestamp}, remote: ${state.remote.timestamp})`);
    
    return winner;
  }

  /**
   * Load local data
   */
  private async loadLocalData(filename: string): Promise<any | null> {
    try {
      const data = await this.readLocalFile(filename);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Load remote data
   */
  private async loadRemoteData(filename: string): Promise<any | null> {
    try {
      const data = await this.readCloudFile(filename);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Create save backup
   */
  private async createBackup(saveData: any): Promise<boolean> {
    const timestamp = Date.now();
    const backupFilename = `player_save_backup_${timestamp}.json`;
    
    try {
      await this.writeCloudFile(backupFilename, JSON.stringify(saveData, null, 2));
      
      // Clean up old backups (keep last 10)
      await this.cleanupBackups();
      
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Clean up old backups
   */
  private async cleanupBackups(): Promise<void> {
    // Implementation depends on Steam API capabilities
    // For now, just log
    console.log('[CloudSave] Backup cleanup would run here');
  }

  /**
   * Force sync local to cloud
   */
  async forceUpload(): Promise<boolean> {
    if (!this.isCloudEnabled()) return false;

    let success = true;

    for (const [, filename] of Object.entries(this.SAVE_FILES)) {
      const localData = await this.readLocalFile(filename);
      if (localData) {
        const cloudSuccess = await this.writeCloudFile(filename, localData);
        if (!cloudSuccess) success = false;
      }
    }

    this.emit('uploadComplete', { success });
    return success;
  }

  /**
   * Force download from cloud
   */
  async forceDownload(): Promise<boolean> {
    if (!this.isCloudEnabled()) return false;

    let success = true;

    for (const [, filename] of Object.entries(this.SAVE_FILES)) {
      const cloudData = await this.readCloudFile(filename);
      if (cloudData) {
        const localSuccess = await this.writeLocalFile(filename, cloudData);
        if (!localSuccess) success = false;
      }
    }

    this.emit('downloadComplete', { success });
    return success;
  }

  /**
   * Delete cloud saves
   */
  async deleteCloudSaves(): Promise<boolean> {
    if (!this.greenworks) return false;

    try {
      // Steam API doesn't typically support direct deletion
      // We overwrite with empty data
      for (const [, filename] of Object.entries(this.SAVE_FILES)) {
        await this.writeCloudFile(filename, JSON.stringify({ deleted: true, timestamp: Date.now() }));
      }
      
      this.emit('cloudDeleted');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Start auto-sync
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(() => {
      this.syncSaves();
    }, intervalMinutes * 60 * 1000);

    console.log(`[CloudSave] Auto-sync started (${intervalMinutes} min interval)`);
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Sync saves (bidirectional)
   */
  async syncSaves(): Promise<{ uploaded: number; downloaded: number; conflicts: number }> {
    const states = await this.checkCloudSaves();
    let uploaded = 0;
    let downloaded = 0;
    let conflicts = 0;

    for (const state of states) {
      if (state.conflict) {
        conflicts++;
        await this.resolveConflict(state);
      } else if (!state.remote && state.local) {
        // Upload new local save
        const data = await this.readLocalFile(state.local.filename);
        if (data && await this.writeCloudFile(state.local.filename, data)) {
          uploaded++;
        }
      } else if (!state.local && state.remote) {
        // Download from cloud
        const data = await this.readCloudFile(state.remote.filename);
        if (data && await this.writeLocalFile(state.remote.filename, data)) {
          downloaded++;
        }
      }
    }

    this.emit('syncComplete', { uploaded, downloaded, conflicts });
    return { uploaded, downloaded, conflicts };
  }

  /**
   * Get save summary
   */
  async getSaveSummary(): Promise<{
    cloudEnabled: boolean;
    quota: { used: number; total: number } | null;
    saves: CloudSaveState[];
  }> {
    const cloudEnabled = this.isCloudEnabled();
    const quota = this.getCloudQuota();
    const saves = await this.checkCloudSaves();

    return { cloudEnabled, quota, saves };
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.stopAutoSync();
    
    // Final sync
    await this.syncSaves();
    
    this.isInitialized = false;
    console.log('[CloudSave] Shutdown complete');
  }
}

// Export singleton
export const cloudSaveManager = CloudSaveManager.getInstance();
export default cloudSaveManager;
