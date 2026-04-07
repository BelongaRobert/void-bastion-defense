/**
 * Void Bastion Defense - Preload Script
 * Secure bridge between renderer (game) and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  
  // App version
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  
  // Path utilities
  getPath: (name) => ipcRenderer.invoke('app:get-path', name),
  
  // Game save/load
  saveGame: (slot, data) => ipcRenderer.invoke('game:save', slot, data),
  loadGame: (slot) => ipcRenderer.invoke('game:load', slot),
  getSaves: () => ipcRenderer.invoke('game:get-saves'),
  
  // Steam integration
  unlockAchievement: (achievementId) => ipcRenderer.invoke('steam:unlock-achievement', achievementId),
  getSteamInfo: () => ipcRenderer.invoke('steam:get-info'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:fullscreen', enabled),
  
  // Dialogs
  showSaveDialog: () => ipcRenderer.invoke('dialog:show-save'),
  showOpenDialog: () => ipcRenderer.invoke('dialog:show-open'),
  
  // File operations
  writeFile: (path, data) => ipcRenderer.invoke('file:write', path, data),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  
  // Event listeners
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:new-game', () => callback('new-game'));
    ipcRenderer.on('menu:load-game', () => callback('load-game'));
    ipcRenderer.on('menu:save-game', () => callback('save-game'));
  },
  
  onFullscreenChange: (callback) => {
    ipcRenderer.on('window:fullscreen-changed', (event, isFullscreen) => {
      callback(isFullscreen);
    });
  },
  
  onAchievementUnlocked: (callback) => {
    ipcRenderer.on('steam:achievement-unlocked', (event, achievementId) => {
      callback(achievementId);
    });
  },
  
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update:available', () => callback());
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Log preload completion
console.log('[Void Bastion] Preload script loaded successfully');
console.log('[Void Bastion] electronAPI exposed to window');
