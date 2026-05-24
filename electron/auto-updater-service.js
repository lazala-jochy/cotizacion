const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');
const { installMacUpdate, CACHE_DIR_NAME } = require('./install-mac-update');

function getUpdaterCacheRoot(app) {
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || app.getPath('localAppData');
    return path.join(local, CACHE_DIR_NAME);
  }
  return path.join(app.getPath('home'), 'Library', 'Caches', CACHE_DIR_NAME);
}

function createAutoUpdaterService({
  autoUpdater,
  dialog,
  getMainWindow,
  sendUpdateStatus,
  formatUpdateError,
  configureGithubUpdater,
  shutdownForUpdate,
}) {
  let updaterReady = false;
  let updateDownloaded = false;
  let pendingVersion = null;
  let downloadInProgress = false;
  let downloadTimeout = null;
  let lastUpdateStatus = { status: 'idle', message: '' };

  function setStatus(payload) {
    lastUpdateStatus = payload;
    sendUpdateStatus(payload);
  }

  function clearDownloadTimeout() {
    if (downloadTimeout) {
      clearTimeout(downloadTimeout);
      downloadTimeout = null;
    }
  }

  function startDownloadTimeout() {
    clearDownloadTimeout();
    downloadTimeout = setTimeout(() => {
      if (!updateDownloaded && downloadInProgress) {
        downloadInProgress = false;
        setStatus({
          status: 'error',
          message: 'La descarga tardó demasiado. Pulsa «Reintentar descarga».',
          canRetry: true,
          percent: 0,
        });
      }
    }, 10 * 60 * 1000);
  }

  async function promptRestart(info) {
    const win = getMainWindow();
    const version = info?.version || pendingVersion || '';
    setStatus({
      status: 'downloaded',
      message: `v${version} lista para instalar.`,
      version,
      canInstall: true,
      canRetry: false,
      percent: 100,
    });

    const { response } = await dialog.showMessageBox(win || undefined, {
      type: 'info',
      title: 'Actualización lista',
      message: `La versión ${version} se descargó correctamente.`,
      detail: 'La aplicación se reiniciará para completar la instalación.',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (response === 0) {
      quitAndInstall();
    }
  }

  async function prepareQuitForInstall() {
    app.removeAllListeners('window-all-closed');
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.destroy();
    });
    if (shutdownForUpdate) {
      await shutdownForUpdate();
    }
    await new Promise((r) => setTimeout(r, process.platform === 'win32' ? 1200 : 300));
  }

  function quitAndInstall() {
    if (!updateDownloaded) return false;
    setStatus({
      status: 'installing',
      message:
        process.platform === 'win32' ?
          'Cerrando e instalando… (no cierres la ventana del instalador)'
        : 'Reiniciando para instalar…',
      percent: 100,
    });

    setImmediate(async () => {
      await prepareQuitForInstall();

      if (process.platform === 'darwin') {
        if (installMacUpdate({ autoUpdater, app })) return;
        updateDownloaded = false;
        setStatus({
          status: 'error',
          message: 'No se encontró el paquete descargado. Pulsa «Reintentar descarga».',
          canRetry: true,
          percent: 0,
        });
        return;
      }

      autoUpdater.quitAndInstall(false, true);
      setTimeout(() => app.exit(0), process.platform === 'win32' ? 2000 : 800);
    });
    return true;
  }

  function clearStaleDownloadCache() {
    updateDownloaded = false;
    downloadInProgress = false;
    pendingVersion = null;
    try {
      autoUpdater.clearCache?.();
    } catch {
      /* ignore */
    }
    const cacheRoot = getUpdaterCacheRoot(app);
    if (fs.existsSync(cacheRoot)) {
      fs.rmSync(cacheRoot, { recursive: true, force: true });
    }
  }

  function syncDownloadedStateWithInstalledVersion() {
    const current = app.getVersion();
    if (pendingVersion && current === pendingVersion) {
      updateDownloaded = false;
      downloadInProgress = false;
      pendingVersion = null;
      setStatus({
        status: 'none',
        message: `Estás en la última versión (v${current}).`,
        canRetry: false,
        percent: 0,
      });
      return true;
    }
    return false;
  }

  async function downloadUpdate(version) {
    if (downloadInProgress || updateDownloaded) return;
    downloadInProgress = true;
    pendingVersion = version;
    startDownloadTimeout();

    setStatus({
      status: 'downloading',
      message: `Descargando v${version}…`,
      version,
      percent: 0,
      canRetry: true,
    });

    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      downloadInProgress = false;
      clearDownloadTimeout();
      setStatus({
        status: 'error',
        message: formatUpdateError(err),
        canRetry: true,
        percent: 0,
      });
      throw err;
    }
  }

  async function runUpdateCheck({ fromUser = false } = {}) {
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
        message: 'Listo. Pulsa «Reiniciar e instalar».',
        canInstall: true,
        canRetry: false,
        percent: 100,
        version: pendingVersion,
      };
      setStatus(done);
      if (fromUser) await promptRestart({ version: pendingVersion });
      return done;
    }

    if (downloadInProgress) {
      return {
        status: 'downloading',
        message: lastUpdateStatus.message || 'Descarga en curso…',
        percent: lastUpdateStatus.percent ?? 0,
        canRetry: true,
        version: pendingVersion,
      };
    }

    try {
      setStatus({ status: 'checking', message: 'Buscando actualizaciones…', percent: 0 });

      const result = await autoUpdater.checkForUpdates();
      const current = app.getVersion();

      if (!result?.updateInfo) {
        const none = {
          status: 'none',
          message: `Estás en la última versión (v${current}).`,
          canRetry: false,
          percent: 0,
        };
        setStatus(none);
        return none;
      }

      const remote = result.updateInfo.version;
      if (remote === current) {
        const none = {
          status: 'none',
          message: `Ya tienes la v${current} instalada.`,
          canRetry: false,
          percent: 0,
        };
        setStatus(none);
        return none;
      }

      await downloadUpdate(remote);

      return {
        status: 'downloading',
        message: `Descargando v${remote}…`,
        version: remote,
        percent: lastUpdateStatus.percent ?? 0,
        canRetry: true,
      };
    } catch (err) {
      const errState = {
        status: 'error',
        message: formatUpdateError(err),
        canRetry: true,
        percent: 0,
      };
      setStatus(errState);
      return errState;
    }
  }

  function setup() {
    const config = configureGithubUpdater(autoUpdater);
    updaterReady = config.ok && (!config.isPrivate || config.hasToken);

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = process.platform !== 'darwin';
    autoUpdater.allowDowngrade = false;
    autoUpdater.disableDifferentialDownload = true;

    if (!updaterReady) return;

    autoUpdater.on('download-progress', (progress) => {
      const pct = Math.round(progress.percent || 0);
      setStatus({
        status: 'downloading',
        message: `Descargando v${pendingVersion}… ${pct}%`,
        version: pendingVersion,
        percent: pct,
        canRetry: true,
      });
    });

    autoUpdater.on('update-downloaded', async (info) => {
      downloadInProgress = false;
      clearDownloadTimeout();

      const current = app.getVersion();
      if (info.version === current) {
        clearStaleDownloadCache();
        return;
      }

      updateDownloaded = true;
      pendingVersion = info.version;
      setStatus({
        status: 'downloaded',
        message: `v${info.version} lista. Pulsa «Reiniciar e instalar».`,
        version: info.version,
        canInstall: true,
        canRetry: false,
        percent: 100,
      });
    });

    autoUpdater.on('error', (err) => {
      downloadInProgress = false;
      clearDownloadTimeout();
      setStatus({
        status: 'error',
        message: formatUpdateError(err),
        canRetry: true,
        percent: 0,
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      const ver = info?.version || app.getVersion();
      setStatus({
        status: 'none',
        message: `Estás en la última versión (v${ver}).`,
        canRetry: false,
        percent: 0,
      });
    });

    autoUpdater.on('update-available', (info) => {
      pendingVersion = info.version;
    });

    syncDownloadedStateWithInstalledVersion();

    setTimeout(() => runUpdateCheck({ fromUser: false }), 8000);
  }

  return {
    setup,
    runUpdateCheck,
    quitAndInstall,
    clearStaleDownloadCache,
    getState: () => {
      if (updateDownloaded) {
        return {
          status: 'downloaded',
          message: 'Listo para instalar.',
          canInstall: true,
          canRetry: false,
          percent: 100,
          version: pendingVersion,
        };
      }
      if (lastUpdateStatus.status !== 'idle') {
        return { ...lastUpdateStatus, canRetry: lastUpdateStatus.canRetry ?? false };
      }
      return { status: 'idle', message: '' };
    },
    isDownloaded: () => updateDownloaded,
  };
}

module.exports = { createAutoUpdaterService };
