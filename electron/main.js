const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { configureGithubUpdater, getPublishConfig } = require('./updater-auth');

const isDev = !app.isPackaged;
const PORT = 3847;
let mainWindow = null;
let updaterReady = false;

function formatUpdateError(err) {
  const msg = err?.message || String(err);
  const publish = getPublishConfig();

  if (publish.private && !updaterReady) {
    return (
      'Repo privado: falta token en esta instalación. ' +
      'Vuelve a compilar con: export GH_TOKEN=ghp_... && npm run dist:publish'
    );
  }

  if (msg.includes('404') || msg.includes('releases.atom')) {
    return (
      'No se encontraron releases en GitHub. ' +
      'Publica con: npm run dist:publish (y comprueba lazala-jochy/cotizacion/releases).'
    );
  }
  if (msg.toLowerCase().includes('authentication token')) {
    return 'Token de GitHub inválido o sin permiso al repo privado.';
  }
  return msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
}

function showBootError(message) {
  dialog.showErrorBox(
    'Cotizaciones — error al iniciar',
    `${message}\n\nSi desarrollas en local: npm run rebuild:dev`
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Cotizaciones',
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

function setupAutoUpdater() {
  if (isDev) return;

  const config = configureGithubUpdater(autoUpdater);
  updaterReady = config.ok && (!config.isPrivate || config.hasToken);

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  if (!updaterReady && config.isPrivate) {
    mainWindow?.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('update-status', {
        status: 'error',
        message: formatUpdateError(new Error('no token')),
      });
    });
    return;
  }

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
      message: formatUpdateError(err),
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

  if (!updaterReady) {
    return { status: 'error', message: formatUpdateError(new Error('no token')) };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.updateInfo) {
      return {
        status: 'available',
        message: `Actualización disponible: v${result.updateInfo.version}`,
        updateInfo: result.updateInfo,
      };
    }
    return { status: 'none', message: 'Estás en la última versión publicada.' };
  } catch (e) {
    return { status: 'error', message: formatUpdateError(e) };
  }
});

ipcMain.handle('quit-and-install', () => {
  if (!isDev) autoUpdater.quitAndInstall();
});

ipcMain.handle('print-quote', async () => {
  if (!mainWindow) return;
  await mainWindow.webContents.print({ silent: false, printBackground: true });
});

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      const { startServer } = require(path.join(__dirname, '..', 'server', 'index.js'));
      await startServer();
    } catch (err) {
      console.error(err);
      const msg =
        err.message?.includes('NODE_MODULE_VERSION') ?
          'Base de datos no compatible con esta build. Reinstala tras ejecutar: npm run dist:publish'
        : err.message || 'No se pudo iniciar el servidor interno';
      showBootError(msg);
      app.quit();
      return;
    }
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
