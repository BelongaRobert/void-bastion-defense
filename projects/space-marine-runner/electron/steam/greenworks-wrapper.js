/**
 * Void Bastion Defense - Steamworks/Greenworks Wrapper
 * Handles Steam API integration for achievements, cloud saves, and overlay
 * 
 * NOTE: This requires the Steamworks SDK to be placed in steamworks_sdk/
 * Download from: https://partner.steamgames.com/
 */

const path = require('path');
const fs = require('fs');

let greenworks = null;
let initialized = false;

// Try to load greenworks module
function loadGreenworks() {
  try {
    // Check if greenworks is installed
    greenworks = require('greenworks');
    console.log('[Steam] Greenworks module loaded');
    return true;
  } catch (error) {
    console.log('[Steam] Greenworks not available:', error.message);
    console.log('[Steam] Running without Steam integration');
    return false;
  }
}

// Initialize Steam
function init() {
  if (initialized) return true;
  
  if (!loadGreenworks()) {
    return false;
  }

  try {
    // Initialize Steam
    const success = greenworks.initAPI();
    if (success) {
      initialized = true;
      console.log('[Steam] Initialized successfully');
      console.log('[Steam] User ID:', greenworks.getSteamId().steamId);
      console.log('[Steam] Username:', greenworks.getSteamId().screenName);
      
      // Enable Steam overlay
      setupOverlay();
      
      return true;
    } else {
      console.log('[Steam] Failed to initialize - Steam not running?');
      return false;
    }
  } catch (error) {
    console.error('[Steam] Initialization error:', error);
    return false;
  }
}

// Setup Steam overlay
function setupOverlay() {
  if (!greenworks || !initialized) return;
  
  try {
    // Enable overlay (automatic in most cases with greenworks)
    console.log('[Steam] Overlay enabled');
  } catch (error) {
    console.error('[Steam] Overlay setup error:', error);
  }
}

// Get Steam ID
function getSteamId() {
  if (!greenworks || !initialized) return null;
  try {
    return greenworks.getSteamId();
  } catch (error) {
    return null;
  }
}

// Get player name
function getPlayerName() {
  const steamId = getSteamId();
  return steamId ? steamId.screenName : 'Player';
}

// Get player ID
function getPlayerId() {
  const steamId = getSteamId();
  return steamId ? steamId.steamId : null;
}

// Unlock achievement
function activateAchievement(achievementId) {
  if (!greenworks || !initialized) {
    console.log(`[Steam] Cannot unlock achievement ${achievementId}: Steam not initialized`);
    return false;
  }

  try {
    greenworks.activateAchievement(achievementId, (success) => {
      if (success) {
        console.log(`[Steam] Achievement unlocked: ${achievementId}`);
      } else {
        console.error(`[Steam] Failed to unlock achievement: ${achievementId}`);
      }
    });
    return true;
  } catch (error) {
    console.error('[Steam] Achievement error:', error);
    return false;
  }
}

// Get achievement status
function getAchievement(achievementId) {
  if (!greenworks || !initialized) return null;
  
  try {
    return greenworks.getAchievement(achievementId);
  } catch (error) {
    console.error('[Steam] Get achievement error:', error);
    return null;
  }
}

// Clear achievement
function clearAchievement(achievementId) {
  if (!greenworks || !initialized) return false;
  
  try {
    greenworks.clearAchievement(achievementId);
    console.log(`[Steam] Achievement cleared: ${achievementId}`);
    return true;
  } catch (error) {
    console.error('[Steam] Clear achievement error:', error);
    return false;
  }
}

// Get all achievements
function getAllAchievements() {
  if (!greenworks || !initialized) return [];
  
  try {
    return greenworks.getAchievements();
  } catch (error) {
    console.error('[Steam] Get all achievements error:', error);
    return [];
  }
}

// Cloud save functions
function cloudSave(fileName, data) {
  if (!greenworks || !initialized) return false;
  
  try {
    const success = greenworks.saveTextToFile(fileName, JSON.stringify(data), () => {
      console.log(`[Steam] Cloud save: ${fileName}`);
    });
    return success;
  } catch (error) {
    console.error('[Steam] Cloud save error:', error);
    return false;
  }
}

function cloudLoad(fileName) {
  if (!greenworks || !initialized) return null;
  
  try {
    const data = greenworks.readTextFromFile(fileName);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Steam] Cloud load error:', error);
    return null;
  }
}

function cloudDelete(fileName) {
  if (!greenworks || !initialized) return false;
  
  try {
    return greenworks.deleteFile(fileName);
  } catch (error) {
    console.error('[Steam] Cloud delete error:', error);
    return false;
  }
}

function getCloudFiles() {
  if (!greenworks || !initialized) return [];
  
  try {
    return greenworks.getFileCountAndSize();
  } catch (error) {
    console.error('[Steam] Get cloud files error:', error);
    return [];
  }
}

function isCloudEnabled() {
  if (!greenworks || !initialized) return false;
  
  try {
    return greenworks.isCloudEnabled();
  } catch (error) {
    return false;
  }
}

function enableCloud(enabled) {
  if (!greenworks || !initialized) return false;
  
  try {
    greenworks.enableCloud(enabled);
    return true;
  } catch (error) {
    console.error('[Steam] Enable cloud error:', error);
    return false;
  }
}

// Stats
function setStat(name, value) {
  if (!greenworks || !initialized) return false;
  
  try {
    return greenworks.setStat(name, value);
  } catch (error) {
    console.error('[Steam] Set stat error:', error);
    return false;
  }
}

function getStat(name) {
  if (!greenworks || !initialized) return 0;
  
  try {
    return greenworks.getStatInt(name);
  } catch (error) {
    console.error('[Steam] Get stat error:', error);
    return 0;
  }
}

function storeStats() {
  if (!greenworks || !initialized) return false;
  
  try {
    greenworks.storeStats();
    return true;
  } catch (error) {
    console.error('[Steam] Store stats error:', error);
    return false;
  }
}

// Rich Presence
function setRichPresence(key, value) {
  if (!greenworks || !initialized) return false;
  
  try {
    return greenworks.setRichPresence(key, value);
  } catch (error) {
    console.error('[Steam] Rich presence error:', error);
    return false;
  }
}

function clearRichPresence() {
  if (!greenworks || !initialized) return false;
  
  try {
    return greenworks.clearRichPresence();
  } catch (error) {
    console.error('[Steam] Clear rich presence error:', error);
    return false;
  }
}

// Workshop (if needed)
const Workshop = {
  createItem: (appId) => {
    if (!greenworks || !initialized) return Promise.reject('Steam not initialized');
    return greenworks.ugcCreateItem(appId, greenworks.UGCFileType.Community);
  },
  
  startUpdateItem: (itemId, contentPath, previewPath, title, description) => {
    if (!greenworks || !initialized) return Promise.reject('Steam not initialized');
    return greenworks.ugcStartItemUpdate(0, itemId);
  }
};

// Event handlers
function on(event, callback) {
  if (!greenworks) return;
  
  try {
    switch(event) {
      case 'game-overlay-activated':
        greenworks.on('game-overlay-activated', callback);
        break;
      case 'steam-servers-connected':
        greenworks.on('steam-servers-connected', callback);
        break;
      case 'steam-servers-disconnected':
        greenworks.on('steam-servers-disconnected', callback);
        break;
    }
  } catch (error) {
    console.error(`[Steam] Event handler error for ${event}:`, error);
  }
}

// Utils
function isInitialized() {
  return initialized;
}

function isSteamRunning() {
  if (!greenworks) return false;
  
  try {
    return greenworks.isSteamRunning();
  } catch (error) {
    return false;
  }
}

function restartAppIfNecessary(appId) {
  if (!greenworks) return false;
  
  try {
    return greenworks.restartAppIfNecessary(appId);
  } catch (error) {
    return false;
  }
}

module.exports = {
  init,
  isInitialized,
  isSteamRunning,
  getSteamId,
  getPlayerName,
  getPlayerId,
  activateAchievement,
  getAchievement,
  clearAchievement,
  getAllAchievements,
  cloudSave,
  cloudLoad,
  cloudDelete,
  getCloudFiles,
  isCloudEnabled,
  enableCloud,
  setStat,
  getStat,
  storeStats,
  setRichPresence,
  clearRichPresence,
  Workshop,
  on,
  restartAppIfNecessary
};
