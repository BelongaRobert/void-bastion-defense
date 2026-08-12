const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('booDesktop', {
  platform: process.platform,
  isElectron: true,
});
