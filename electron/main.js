const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { configureGithubUpdater, getPublishConfig } = require('./updater-auth');
const { createAutoUpdaterService } = require('./auto-updater-service');
const { shutdownForUpdate } = require('./shutdown-for-update');
const {
  getActivationState,
  activateProductKey,
} = require('./licensing/activation.service');

const isDev = !app.isPackaged;
const PORT = 3847;

function getAppIconPath() {
  return path.join(__dirname, '..', 'asset', 'icon.png');
}

function getAppIcon() {
  const iconPath = getAppIconPath();
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? undefined : image;
}
let mainWindow = null;
let updaterService = null;
let httpServer = null;

function sendUpdateStatus(payload) {
  mainWindow?.webContents.send('update-status', payload);
}

function formatUpdateError(err) {
  const msg = err?.message || String(err);
  const publish = getPublishConfig();

  if (publish.private && msg.includes('no token')) {
    return 'Actualizaciones no configuradas. Vuelve a instalar desde un release reciente.';
  }

  if (msg.includes('404') || msg.includes('releases.atom')) {
    return 'No se pudo conectar con GitHub Releases. Verifica tu conexión o pulsa Reintentar.';
  }
  if (msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('bad credentials')) {
    return 'Token de actualización inválido. Publica de nuevo con GH_TOKEN en .env.';
  }
  if (msg.includes('ENOENT') || msg.includes('zip')) {
    return 'Error al aplicar la actualización. Pulsa «Reiniciar e instalar» o Reintentar.';
  }
  if (/uninstall|desinstal/i.test(msg)) {
    return 'No se pudo reemplazar la versión anterior. Cierra Cotizaciones (y el Administrador de tareas) e inténtalo de nuevo.';
  }
  return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg;
}

function showBootError(message) {
  const devHint = isDev ? '\n\nSi desarrollas en local: npm run rebuild:dev' : '';
  dialog.showErrorBox('Cotizaciones — error al iniciar', `${message}${devHint}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Cotizaciones',
    icon: getAppIconPath(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = isDev ? 'http://localhost:5173' : `http://127.0.0.1:${PORT}`;

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.show();
    if (updaterService?.isDownloaded()) {
      sendUpdateStatus(updaterService.getState());
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('did-fail-load', code, description);
    showBootError(`No se pudo cargar la aplicación (${description})`);
    mainWindow?.show();
  });

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initUpdater() {
  if (isDev) return;

  updaterService = createAutoUpdaterService({
    autoUpdater,
    dialog,
    getMainWindow: () => mainWindow,
    sendUpdateStatus,
    formatUpdateError,
    configureGithubUpdater,
    shutdownForUpdate,
  });
  updaterService.setup();
}

ipcMain.handle('get-update-state', () => {
  if (isDev) return { status: 'idle', message: '' };
  return updaterService?.getState() || { status: 'idle', message: '' };
});

ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { status: 'idle', message: '', canRetry: false };
  }
  if (!updaterService) {
    return { status: 'error', message: 'Actualizador no disponible', canRetry: false };
  }
  return updaterService.runUpdateCheck({ fromUser: true });
});

ipcMain.handle('quit-and-install', () => {
  if (isDev || !updaterService) return { ok: false };
  return { ok: updaterService.quitAndInstall() };
});

ipcMain.handle('clear-update-cache', () => {
  if (isDev || !updaterService) return { ok: false };
  updaterService.clearStaleDownloadCache();
  return { ok: true };
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('print-quote', async () => {
  if (!mainWindow) return;
  await mainWindow.webContents.print({ silent: false, printBackground: true });
});

ipcMain.handle('license:get-activation-state', () => {
  return getActivationState();
});

ipcMain.handle('license:activate-product-key', (_event, productKey) => {
  return activateProductKey(productKey);
});

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      const { startServer } = require(path.join(__dirname, '..', 'server', 'index.js'));
      httpServer = await startServer();
    } catch (err) {
      console.error(err);
      const msg =
        err.message?.includes('NODE_MODULE_VERSION') ?
          'Base de datos incompatible con esta versión. Descarga e instala de nuevo el .dmg más reciente desde GitHub Releases.'
        : err.message || 'No se pudo iniciar el servidor interno';
      showBootError(msg);
      app.quit();
      return;
    }
  }

  const appIcon = getAppIcon();
  if (appIcon && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIcon);
  }

  createWindow();
  initUpdater();
});

app.on('before-quit-for-update', () => {
  try {
    if (httpServer) httpServer.close();
    require(path.join(__dirname, '..', 'server', 'db')).close();
  } catch {
    /* ignore */
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
