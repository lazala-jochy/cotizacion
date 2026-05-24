const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
const PORT = 3847;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Cotizaciones',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = isDev ? 'http://localhost:5173' : `http://127.0.0.1:${PORT}`;
  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-status', {
      status: 'available',
      message: 'Hay una actualización disponible. Descargando…',
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-status', {
      status: 'downloaded',
      message: 'Actualización lista. Se instalará al reiniciar la app.',
    });
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-status', {
      status: 'error',
      message: err.message,
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', {
      status: 'none',
      message: 'Estás en la última versión.',
    });
  });

  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 5000);
}

ipcMain.handle('check-for-updates', async () => {
  if (isDev) return { status: 'dev', message: 'Actualizaciones desactivadas en desarrollo' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checking', updateInfo: result?.updateInfo };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

ipcMain.handle('quit-and-install', () => {
  if (!isDev) autoUpdater.quitAndInstall();
});

ipcMain.handle('print-quote', async () => {
  if (!mainWindow) return;
  await mainWindow.webContents.print({ silent: false, printBackground: true });
});

app.whenReady().then(() => {
  if (!isDev) {
    require(path.join(__dirname, '..', 'server', 'index.js'));
  }
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

