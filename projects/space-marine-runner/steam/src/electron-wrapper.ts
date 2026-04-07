/**
 * Void Bastion Defense - Electron Steam Wrapper
 * Integrates Steam features into the Electron application
 * The Emperor's blessing upon this code! ⚔️🐙
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { steamIntegration } from './steam-integration';
import { cloudSaveManager } from './cloud-save';
import { leaderboardManager } from './leaderboards';
import { statsManager } from './stats-manager';

// Steam app ID for Void Bastion Defense
const STEAM_APP_ID = 'XXXXXX'; // Replace with actual Steam App ID when available

// Standalone mode flag
let isStandaloneMode: boolean = false;

/**
 * Initialize Steam integration in Electron main process
 */
export async function initializeSteamElectron(): Promise<{
  success: boolean;
  mode: 'steam' | 'standalone';
  steamId: string | null;
}> {
  console.log('[Electron] Initializing Steam integration...');

  // Initialize Steam
  const steamSuccess = await steamIntegration.initialize();
  const steamId = steamIntegration.getSteamId();

  if (steamSuccess) {
    console.log('[Electron] Steam initialized successfully');
    isStandaloneMode = false;

    // Initialize subsystems
    await cloudSaveManager.initialize(steamIntegration['greenworks']);
    await leaderboardManager.initialize(steamIntegration['greenworks'], steamId || 'unknown');
    await statsManager.initialize(steamIntegration['greenworks'], steamId);

    // Start auto-sync
    cloudSaveManager.startAutoSync(5); // Every 5 minutes

    // Set up IPC handlers
    setupIpcHandlers();

    return { success: true, mode: 'steam', steamId };
  } else {
    console.log('[Electron] Running in standalone mode');
    isStandaloneMode = true;

    // Initialize stats manager without Steam
    await statsManager.initialize(null, null);

    // Set up IPC handlers for standalone mode
    setupStandaloneIpcHandlers();

    return { success: true, mode: 'standalone', steamId: null };
  }
}

/**
 * Set up IPC handlers for Steam mode
 */
function setupIpcHandlers(): void {
  // Achievement unlock
  ipcMain.handle('steam:unlockAchievement', (event, achievementId: string) => {
    return steamIntegration.unlockAchievement(achievementId);
  });

  // Get achievements
  ipcMain.handle('steam:getAchievements', () => {
    return {
      all: steamIntegration.getAchievements(),
      unlocked: steamIntegration.getUnlockedAchievements()
    };
  });

  // Set rich presence
  ipcMain.handle('steam:setRichPresence', (event, status: string, details?: Record<string, string>) => {
    steamIntegration.setRichPresence(status, details);
    return true;
  });

  // Start game presence
  ipcMain.handle('steam:startGamePresence', (event, wave: number, score: number) => {
    steamIntegration.startRichPresenceUpdates(wave, score);
    return true;
  });

  // Stop game presence
  ipcMain.handle('steam:stopGamePresence', () => {
    steamIntegration.stopRichPresenceUpdates();
    return true;
  });

  // Get player stats
  ipcMain.handle('steam:getPlayerStats', () => {
    return statsManager.getPlayerStats();
  });

  // Update player stat
  ipcMain.handle('steam:updateStat', (event, statName: string, value: number) => {
    switch (statName) {
      case 'kills':
        statsManager.trackKill();
        break;
      case 'wave':
        statsManager.trackWaveCompleted(value);
        break;
      case 'tower':
        statsManager.trackTowerBuilt('unknown');
        break;
      case 'boss':
        statsManager.trackBossDefeated();
        break;
    }
    return true;
  });

  // Get leaderboards
  ipcMain.handle('steam:getLeaderboard', async (event, leaderboardName: string, type: string, start?: number, end?: number) => {
    try {
      if (type === 'global') {
        return await leaderboardManager.getGlobalLeaderboard(leaderboardName, start || 0, end || 10);
      } else if (type === 'friends') {
        return await leaderboardManager.getFriendsLeaderboard(leaderboardName);
      } else if (type === 'around') {
        return await leaderboardManager.getLeaderboardAroundUser(leaderboardName);
      }
      return [];
    } catch (e) {
      console.error('[IPC] Leaderboard error:', e);
      return [];
    }
  });

  // Upload score
  ipcMain.handle('steam:uploadScore', async (event, leaderboardName: string, score: number, details?: string) => {
    try {
      return await leaderboardManager.uploadScore(leaderboardName, score, details);
    } catch (e) {
      console.error('[IPC] Upload score error:', e);
      return false;
    }
  });

  // Get weekly challenge
  ipcMain.handle('steam:getWeeklyChallenge', () => {
    return leaderboardManager.getCurrentChallenge();
  });

  // Cloud save
  ipcMain.handle('steam:saveGame', async (event, data: any) => {
    return await cloudSaveManager.savePlayerData(data, { backup: true });
  });

  ipcMain.handle('steam:loadGame', async () => {
    return await cloudSaveManager.loadPlayerData();
  });

  ipcMain.handle('steam:syncSaves', async () => {
    return await cloudSaveManager.syncSaves();
  });

  ipcMain.handle('steam:getSaveSummary', async () => {
    return await cloudSaveManager.getSaveSummary();
  });

  // Steam overlay
  ipcMain.handle('steam:activateOverlay', (event, option?: string) => {
    steamIntegration.activateOverlay(option);
    return true;
  });

  // Steam ID
  ipcMain.handle('steam:getSteamId', () => {
    return steamIntegration.getSteamId();
  });

  // Steam username
  ipcMain.handle('steam:getUserName', () => {
    return steamIntegration.getUserName();
  });

  // Is Steam running
  ipcMain.handle('steam:isRunning', () => {
    return steamIntegration.isRunning();
  });

  console.log('[Electron] IPC handlers registered');
}

/**
 * Set up IPC handlers for standalone mode
 */
function setupStandaloneIpcHandlers(): void {
  // Achievements (local only)
  const localAchievements = new Set<string>();

  ipcMain.handle('steam:unlockAchievement', (event, achievementId: string) => {
    localAchievements.add(achievementId);
    console.log(`[Standalone] Achievement unlocked: ${achievementId}`);
    return true;
  });

  ipcMain.handle('steam:getAchievements', () => {
    return {
      all: steamIntegration.getAchievements(),
      unlocked: Array.from(localAchievements)
    };
  });

  // Rich presence (no-op in standalone)
  ipcMain.handle('steam:setRichPresence', () => false);
  ipcMain.handle('steam:startGamePresence', () => false);
  ipcMain.handle('steam:stopGamePresence', () => false);

  // Stats (local only)
  ipcMain.handle('steam:getPlayerStats', () => {
    return statsManager.getPlayerStats();
  });

  ipcMain.handle('steam:updateStat', (event, statName: string, value: number) => {
    // Stats are still tracked locally
    return true;
  });

  // Leaderboards (disabled in standalone)
  ipcMain.handle('steam:getLeaderboard', () => []);
  ipcMain.handle('steam:uploadScore', () => false);
  ipcMain.handle('steam:getWeeklyChallenge', () => null);

  // Cloud saves (disabled in standalone)
  ipcMain.handle('steam:saveGame', async (event, data: any) => {
    // Save to local file only
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const savePath = path.join(app.getPath('userData'), 'saves', 'player_save.json');
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, JSON.stringify({ ...data, timestamp: Date.now() }, null, 2));
      return true;
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle('steam:loadGame', async () => {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const savePath = path.join(app.getPath('userData'), 'saves', 'player_save.json');
      const data = await fs.readFile(savePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('steam:syncSaves', () => ({ uploaded: 0, downloaded: 0, conflicts: 0 }));
  ipcMain.handle('steam:getSaveSummary', () => ({
    cloudEnabled: false,
    quota: null,
    saves: []
  }));

  // Steam overlay (disabled)
  ipcMain.handle('steam:activateOverlay', () => false);

  // Steam ID (null in standalone)
  ipcMain.handle('steam:getSteamId', () => null);
  ipcMain.handle('steam:getUserName', () => 'Commander');
  ipcMain.handle('steam:isRunning', () => false);

  console.log('[Electron] Standalone IPC handlers registered');
}

/**
 * Get preload script for renderer process
 */
export function getPreloadScript(): string {
  return `
    const { contextBridge, ipcRenderer } = require('electron');

    // Steam API for renderer process
    contextBridge.exposeInMainWorld('steamAPI', {
      // Achievements
      unlockAchievement: (achievementId) => ipcRenderer.invoke('steam:unlockAchievement', achievementId),
      getAchievements: () => ipcRenderer.invoke('steam:getAchievements'),

      // Rich Presence
      setRichPresence: (status, details) => ipcRenderer.invoke('steam:setRichPresence', status, details),
      startGamePresence: (wave, score) => ipcRenderer.invoke('steam:startGamePresence', wave, score),
      stopGamePresence: () => ipcRenderer.invoke('steam:stopGamePresence'),

      // Stats
      getPlayerStats: () => ipcRenderer.invoke('steam:getPlayerStats'),
      updateStat: (statName, value) => ipcRenderer.invoke('steam:updateStat', statName, value),

      // Leaderboards
      getLeaderboard: (leaderboardName, type, start, end) => 
        ipcRenderer.invoke('steam:getLeaderboard', leaderboardName, type, start, end),
      uploadScore: (leaderboardName, score, details) => 
        ipcRenderer.invoke('steam:uploadScore', leaderboardName, score, details),
      getWeeklyChallenge: () => ipcRenderer.invoke('steam:getWeeklyChallenge'),

      // Cloud Saves
      saveGame: (data) => ipcRenderer.invoke('steam:saveGame', data),
      loadGame: () => ipcRenderer.invoke('steam:loadGame'),
      syncSaves: () => ipcRenderer.invoke('steam:syncSaves'),
      getSaveSummary: () => ipcRenderer.invoke('steam:getSaveSummary'),

      // Steam Info
      getSteamId: () => ipcRenderer.invoke('steam:getSteamId'),
      getUserName: () => ipcRenderer.invoke('steam:getUserName'),
      isSteamRunning: () => ipcRenderer.invoke('steam:isRunning'),

      // Overlay
      activateOverlay: (option) => ipcRenderer.invoke('steam:activateOverlay', option),
    });

    console.log('[Preload] Steam API exposed');
  `;
}

/**
 * Save preload script to file
 */
export async function savePreloadScript(outputPath: string): Promise<void> {
  const fs = require('fs').promises;
  const script = getPreloadScript();
  await fs.writeFile(outputPath, script, 'utf8');
  console.log(`[Electron] Preload script saved to: ${outputPath}`);
}

/**
 * Check if running in Steam mode
 */
export function isSteamMode(): boolean {
  return !isStandaloneMode;
}

/**
 * Check if running in standalone mode
 */
export function isStandalone(): boolean {
  return isStandaloneMode;
}

/**
 * Shutdown Steam integration
 */
export async function shutdownSteamElectron(): Promise<void> {
  console.log('[Electron] Shutting down Steam integration...');

  await cloudSaveManager.shutdown();
  await statsManager.shutdown();
  leaderboardManager.shutdown();
  steamIntegration.shutdown();

  console.log('[Electron] Steam integration shutdown complete');
}

/**
 * Create main window with Steam integration
 */
export function createSteamWindow(options?: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  const preloadPath = path.join(__dirname, 'steam-preload.js');

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1280,
    height: 720,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      ...options?.webPreferences
    },
    ...options
  };

  const window = new BrowserWindow(windowOptions);

  // Handle Steam overlay
  if (steamIntegration.isRunning()) {
    window.webContents.on('did-finish-load', () => {
      // Steam overlay should work automatically with the right flags
      console.log('[Window] Steam overlay ready');
    });
  }

  return window;
}

// Export all modules
export {
  steamIntegration,
  cloudSaveManager,
  leaderboardManager,
  statsManager
};

export default {
  initializeSteamElectron,
  shutdownSteamElectron,
  isSteamMode,
  isStandalone,
  createSteamWindow,
  savePreloadScript
};
