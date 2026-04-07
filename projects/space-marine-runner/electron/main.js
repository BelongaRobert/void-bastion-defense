/**
 * Void Bastion Defense - Main Electron Process
 * Handles window management, menu system, Steam integration hooks, and IPC
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Global window reference
let mainWindow = null;
let steamIntegration = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.warn('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    log.info('Second instance detected, focusing existing window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Steamworks SDK placeholder
// Uncomment when Steamworks SDK is available
// const greenworks = require('./steam/greenworks-wrapper');

class SteamIntegration {
  constructor() {
    this.initialized = false;
    this.achievements = [];
    this.cloudSavesEnabled = false;
  }

  async init() {
    try {
      // Placeholder for Steamworks initialization
      // Replace with actual greenworks.init() when SDK available
      log.info('Steam integration: Initializing...');
      
      // Simulate Steam init (remove when using real SDK)
      this.initialized = true;
      this.cloudSavesEnabled = true;
      
      log.info('Steam integration: Initialized successfully');
      return true;
    } catch (error) {
      log.error('Steam integration failed:', error);
      return false;
    }
  }

  // Achievement system
  unlockAchievement(achievementId) {
    if (!this.initialized) {
      log.warn(`Cannot unlock achievement ${achievementId}: Steam not initialized`);
      return false;
    }

    try {
      // Placeholder for actual achievement unlock
      // greenworks.activateAchievement(achievementId);
      log.info(`Achievement unlocked: ${achievementId}`);
      this.achievements.push({
        id: achievementId,
        unlockedAt: new Date().toISOString()
      });
      
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('steam:achievement-unlocked', achievementId);
      }
      return true;
    } catch (error) {
      log.error(`Failed to unlock achievement ${achievementId}:`, error);
      return false;
    }
  }

  // Cloud save system
  async saveToCloud(slot, data) {
    if (!this.initialized || !this.cloudSavesEnabled) {
      log.warn('Cloud saves not available');
      return false;
    }

    try {
      const savePath = path.join(app.getPath('userData'), 'saves', `save${slot}.json`);
      await fs.promises.mkdir(path.dirname(savePath), { recursive: true });
      await fs.promises.writeFile(savePath, JSON.stringify(data, null, 2));
      
      log.info(`Game saved to slot ${slot}`);
      return true;
    } catch (error) {
      log.error('Cloud save failed:', error);
      return false;
    }
  }

  async loadFromCloud(slot) {
    try {
      const savePath = path.join(app.getPath('userData'), 'saves', `save${slot}.json`);
      if (!fs.existsSync(savePath)) {
        log.info(`No save found in slot ${slot}`);
        return null;
      }
      
      const data = await fs.promises.readFile(savePath, 'utf8');
      log.info(`Game loaded from slot ${slot}`);
      return JSON.parse(data);
    } catch (error) {
      log.error('Cloud load failed:', error);
      return null;
    }
  }

  getCloudSaves() {
    const savesDir = path.join(app.getPath('userData'), 'saves');
    if (!fs.existsSync(savesDir)) return [];
    
    try {
      return fs.readdirSync(savesDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const stat = fs.statSync(path.join(savesDir, file));
          return {
            slot: parseInt(file.match(/save(\d+)\.json/)?.[1] || 0),
            lastModified: stat.mtime.toISOString(),
            size: stat.size
          };
        });
    } catch (error) {
      log.error('Failed to list cloud saves:', error);
      return [];
    }
  }
}

// Create the main application window
function createWindow() {
  log.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'Void Bastion Defense',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'default',
    frame: true
  });

  // Load the game
  const gamePath = path.join(__dirname, 'src', 'index.html');
  if (fs.existsSync(gamePath)) {
    mainWindow.loadFile(gamePath);
  } else {
    log.error('Game file not found:', gamePath);
    mainWindow.loadURL(`data:text/html,<html><body style="background:#0a0a0f;color:#ff4400;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>⚔️ Void Bastion Defense</h1><p>Game files not found. Please ensure the game is properly installed.</p><p style="color:#666;font-size:12px;">Expected: ${gamePath}</p></div></body></html>`);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates in production
    if (!isDev()) {
      checkForUpdates();
    }
  });

  // Window event handlers
  mainWindow.on('closed', () => {
    log.info('Main window closed');
    mainWindow = null;
  });

  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    log.debug(`Window resized: ${width}x${height}`);
  });

  // Handle fullscreen toggle
  mainWindow.on('enter-full-screen', () => {
    log.info('Entered fullscreen mode');
    mainWindow.webContents.send('window:fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    log.info('Left fullscreen mode');
    mainWindow.webContents.send('window:fullscreen-changed', false);
  });

  // Setup application menu
  setupMenu();
}

// Setup application menu
function setupMenu() {
  const template = [
    {
      label: '&File',
      submenu: [
        {
          label: '&New Game',
          accelerator: 'Ctrl+N',
          click: () => {
            log.info('Menu: New Game');
            mainWindow.webContents.send('menu:new-game');
          }
        },
        {
          label: '&Load Game',
          accelerator: 'Ctrl+L',
          click: () => {
            log.info('Menu: Load Game');
            mainWindow.webContents.send('menu:load-game');
          }
        },
        {
          label: '&Save Game',
          accelerator: 'Ctrl+S',
          click: () => {
            log.info('Menu: Save Game');
            mainWindow.webContents.send('menu:save-game');
          }
        },
        { type: 'separator' },
        {
          label: '&Quit',
          accelerator: 'Ctrl+Q',
          click: () => {
            log.info('Menu: Quit');
            app.quit();
          }
        }
      ]
    },
    {
      label: '&View',
      submenu: [
        {
          label: '&Fullscreen',
          accelerator: 'F11',
          click: () => {
            const isFullScreen = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFullScreen);
            log.info(`Fullscreen toggled: ${!isFullScreen}`);
          }
        },
        { type: 'separator' },
        {
          label: '&Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (isDev()) {
              mainWindow.webContents.toggleDevTools();
            } else {
              log.warn('Developer Tools disabled in production');
            }
          },
          visible: isDev()
        },
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: () => {
            if (isDev()) {
              mainWindow.webContents.reload();
            }
          },
          visible: isDev()
        }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: '&About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Void Bastion Defense',
              message: 'Void Bastion Defense v1.0.0',
              detail: 'A space marine tower defense game.\n\nThe Emperor protects! ⚔️🐙',
              buttons: ['OK'],
              icon: path.join(__dirname, 'assets', 'icon.ico')
            });
          }
        },
        {
          label: '&Controls',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Game Controls',
              message: 'Keyboard Controls',
              detail: 'WASD / Arrow Keys - Move\nSpace - Action/Build\nEsc - Pause/Menu\nF11 - Toggle Fullscreen\n\nThe Emperor protects!',
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Visit &Website',
          click: () => {
            shell.openExternal('https://voidbastion.com');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'About ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Cmd+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Check for updates
function checkForUpdates() {
  log.info('Checking for updates...');
  
  autoUpdater.checkForUpdatesAndNotify().catch(error => {
    log.error('Update check failed:', error);
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    mainWindow.webContents.send('update:available');
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
  });
}

// Utility: Check if running in development
function isDev() {
  return process.argv.includes('--dev') || 
         process.env.NODE_ENV === 'development' ||
         !app.isPackaged;
}

// IPC Handlers
function setupIPC() {
  // Save game data
  ipcMain.handle('game:save', async (event, slot, data) => {
    if (steamIntegration) {
      return await steamIntegration.saveToCloud(slot, data);
    }
    return false;
  });

  // Load game data
  ipcMain.handle('game:load', async (event, slot) => {
    if (steamIntegration) {
      return await steamIntegration.loadFromCloud(slot);
    }
    return null;
  });

  // Get save slots
  ipcMain.handle('game:get-saves', () => {
    if (steamIntegration) {
      return steamIntegration.getCloudSaves();
    }
    return [];
  });

  // Achievement unlock
  ipcMain.handle('steam:unlock-achievement', (event, achievementId) => {
    if (steamIntegration) {
      return steamIntegration.unlockAchievement(achievementId);
    }
    return false;
  });

  // Get Steam info
  ipcMain.handle('steam:get-info', () => {
    if (steamIntegration && steamIntegration.initialized) {
      return {
        initialized: true,
        cloudSavesEnabled: steamIntegration.cloudSavesEnabled,
        achievements: steamIntegration.achievements
      };
    }
    return { initialized: false };
  });

  // Window controls
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:fullscreen', (event, enabled) => {
    if (mainWindow) mainWindow.setFullScreen(enabled);
  });

  // Show save dialog
  ipcMain.handle('dialog:show-save', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Game',
      defaultPath: 'void_bastion_save.json',
      filters: [
        { name: 'Save Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result;
  });

  // Show load dialog
  ipcMain.handle('dialog:show-open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Load Game',
      properties: ['openFile'],
      filters: [
        { name: 'Save Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result;
  });

  // File operations
  ipcMain.handle('file:write', async (event, filePath, data) => {
    try {
      await fs.promises.writeFile(filePath, data);
      return { success: true };
    } catch (error) {
      log.error('File write error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:read', async (event, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      return { success: true, data };
    } catch (error) {
      log.error('File read error:', error);
      return { success: false, error: error.message };
    }
  });

  // Get app version
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  // Get paths
  ipcMain.handle('app:get-path', (event, name) => {
    return app.getPath(name);
  });
}

// App event handlers
app.whenReady().then(async () => {
  log.info('Application ready');

  // Initialize Steam integration
  steamIntegration = new SteamIntegration();
  await steamIntegration.init();

  // Setup IPC
  setupIPC();

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('Application quitting...');
});

// Crash reporter
app.on('render-process-gone', (event, webContents, details) => {
  log.error('Render process gone:', details);
});

app.on('child-process-gone', (event, details) => {
  log.error('Child process gone:', details);
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    log.warn('Blocked new window creation:', navigationUrl);
  });

  // Security: Prevent navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'null') {
      event.preventDefault();
      log.warn('Blocked navigation to:', navigationUrl);
    }
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(false);
  log.error('Certificate error:', error);
});

// Export for testing
module.exports = { SteamIntegration };
