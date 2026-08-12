const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = process.argv.includes('--dev');

/** @type {BrowserWindow | null} */
let mainWindow = null;

function readSteamAppId() {
  try {
    const p = path.join(__dirname, '..', 'steam', 'steam_appid.txt');
    const raw = fs.readFileSync(p, 'utf8').trim();
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function isDeckLikelyEnv() {
  // Steam Deck sets these when running games through gamescope / SteamOS.
  return (
    process.env.SteamDeck === '1' ||
    process.env.STEAM_DECK === '1' ||
    /steamdeck/i.test(process.env.USER ?? '') ||
    /steamdeck/i.test(process.env.HOSTNAME ?? '')
  );
}

function createWindow() {
  const deck = isDeckLikelyEnv();
  mainWindow = new BrowserWindow({
    width: deck ? 1280 : 1280,
    height: deck ? 800 : 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#070b12',
    title: 'Black Orbit Outpost',
    fullscreen: deck || process.argv.includes('--fullscreen'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    if (!deck) mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerSteamStubs() {
  const appId = readSteamAppId();
  const unlocked = new Set();

  ipcMain.handle('steam:getStatus', async () => ({
    isSteam: false,
    appId,
    note: appId
      ? 'App ID present — wire greenworks/steamworks.js before ship'
      : 'No App ID yet — standalone mode',
  }));

  ipcMain.handle('steam:unlockAchievement', async (_e, id) => {
    unlocked.add(String(id));
    console.info('[Steam stub] achievement', id);
    return true;
  });

  ipcMain.handle('steam:setRichPresence', async (_e, key, value) => {
    console.info('[Steam stub] rich presence', key, value);
    return true;
  });

  const cloud = new Map();
  ipcMain.handle('steam:writeCloud', async (_e, name, data) => {
    cloud.set(String(name), String(data));
    console.info('[Steam stub] cloud write', name, String(data).length, 'bytes');
    return true;
  });
  ipcMain.handle('steam:readCloud', async (_e, name) => cloud.get(String(name)) ?? null);
}

app.whenReady().then(() => {
  registerSteamStubs();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
