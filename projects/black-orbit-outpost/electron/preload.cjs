const { contextBridge, ipcRenderer } = require('electron');
const os = require('node:os');

const isDeckLikely =
  process.env.SteamDeck === '1' ||
  process.env.STEAM_DECK === '1' ||
  /steamdeck/i.test(process.env.USER ?? '') ||
  /steamdeck/i.test(os.hostname());

contextBridge.exposeInMainWorld('booDesktop', {
  platform: process.platform,
  isElectron: true,
  isDeckLikely,
});

contextBridge.exposeInMainWorld('steamAPI', {
  isSteam: false,
  appId: null,
  unlockAchievement: (id) => ipcRenderer.invoke('steam:unlockAchievement', id),
  setRichPresence: (key, value) => ipcRenderer.invoke('steam:setRichPresence', key, value),
  getStatus: () => ipcRenderer.invoke('steam:getStatus'),
});
