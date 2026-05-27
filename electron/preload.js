const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  clearUpdateCache: () => ipcRenderer.invoke('clear-update-cache'),
  printQuote: () => ipcRenderer.invoke('print-quote'),
  getActivationState: () => ipcRenderer.invoke('license:get-activation-state'),
  activateProductKey: (productKey) => ipcRenderer.invoke('license:activate-product-key', productKey),
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});
