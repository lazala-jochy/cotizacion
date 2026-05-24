const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { configureGithubUpdater, getPublishConfig } = require('./updater-auth');

const isDev = !app.isPackaged;
const PORT = 3847;
let mainWindow = null;
let updaterReady = false;
let updateDownloaded = false;
let lastUpdateStatus = { status: 'idle', message: '' };

function sendUpdateStatus(payload) {
  lastUpdateStatus = payload;
  mainWindow?.webContents.send('update-status', payload);
}

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
    if (publish.private) {
      return (
        'No se pudo acceder al repo privado. ' +
        'Descarga el .dmg desde Releases o recompila con GH_TOKEN válido.'
      );
    }
    return (
      'No se encontraron releases en GitHub. ' +
      'Comprueba https://github.com/lazala-jochy/cotizacion/releases'
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
    if (updateDownloaded) {
      sendUpdateStatus({
        status: 'downloaded',
        message: 'Actualización lista. Pulsa «Reiniciar e instalar».',
        canInstall: true,
      });
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

function setupAutoUpdater() {
  if (isDev) return;

  const config = configureGithubUpdater(autoUpdater);
  updaterReady = config.ok && (!config.isPrivate || config.hasToken);

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  if (!updaterReady && config.isPrivate) {
    mainWindow?.webContents.once('did-finish-load', () => {
      sendUpdateStatus({
        status: 'error',
        message: formatUpdateError(new Error('no token')),
      });
    });
    return;
  }

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'downloading',
      message: `Descargando v${info.version}…`,
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent || 0);
    sendUpdateStatus({
      status: 'downloading',
      message: `Descargando actualización… ${pct}%`,
      percent: pct,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    sendUpdateStatus({
      status: 'downloaded',
      message: `v${info.version} lista. Pulsa «Reiniciar e instalar».`,
      version: info.version,
      canInstall: true,
    });
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus({
      status: 'error',
      message: formatUpdateError(err),
      canRetry: true,
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({
      status: 'none',
      message: 'Estás en la última versión.',
    });
  });

  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 5000);
}

ipcMain.handle('get-update-state', () => {
  if (isDev) {
    return { status: 'dev', message: 'Solo en app instalada' };
  }
  if (updateDownloaded) {
    return {
      status: 'downloaded',
      message: 'Actualización lista.',
      canInstall: true,
      canRetry: false,
      percent: 100,
    };
  }
  return lastUpdateStatus.status !== 'idle' ?
      { ...lastUpdateStatus, canRetry: lastUpdateStatus.canRetry ?? false }
    : { status: 'idle', message: '' };
});

ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { status: 'dev', message: 'Actualizaciones desactivadas en desarrollo', canRetry: false };
  }

  if (!updaterReady) {
    return {
      status: 'error',
      message: formatUpdateError(new Error('no token')),
      canRetry: false,
    };
  }

  if (updateDownloaded) {
    const done = {
      status: 'downloaded',
      message: 'Listo para instalar.',
      canInstall: true,
      canRetry: false,
      percent: 100,
    };
    sendUpdateStatus(done);
    return done;
  }

  try {
    sendUpdateStatus({ status: 'checking', message: 'Buscando actualizaciones…', percent: 0 });

    const result = await autoUpdater.checkForUpdates();

    if (!result?.updateInfo) {
      const none = { status: 'none', message: 'Estás en la última versión.', canRetry: false, percent: 0 };
      sendUpdateStatus(none);
      return none;
    }

    const version = result.updateInfo.version;
    const downloading = {
      status: 'downloading',
      message: `Descargando v${version}…`,
      version,
      percent: 0,
      canRetry: true,
    };
    sendUpdateStatus(downloading);

    if (result.downloadPromise) {
      result.downloadPromise.catch((err) => {
        sendUpdateStatus({
          status: 'error',
          message: formatUpdateError(err),
          canRetry: true,
          percent: 0,
        });
      });
    }

    return downloading;
  } catch (e) {
    const errState = {
      status: 'error',
      message: formatUpdateError(e),
      canRetry: true,
      percent: 0,
    };
    sendUpdateStatus(errState);
    return errState;
  }
});

ipcMain.handle('quit-and-install', () => {
  if (isDev || !updateDownloaded) return { ok: false };
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
  return { ok: true };
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
