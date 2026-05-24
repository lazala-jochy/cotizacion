const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { BrowserWindow } = require('electron');

const CACHE_DIR_NAME = 'cotizaciones-app-updater';

function getAppBundlePath() {
  return path.resolve(process.execPath, '../../..');
}

function findZipInCache(homeDir) {
  const pending = path.join(homeDir, 'Library', 'Caches', CACHE_DIR_NAME, 'pending');
  if (!fs.existsSync(pending)) return null;

  const entries = fs.readdirSync(pending, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(pending, entry.name);
    if (entry.isFile() && entry.name.endsWith('.zip')) return full;
    if (entry.isDirectory()) {
      const zip = path.join(full, 'update.zip');
      if (fs.existsSync(zip)) return zip;
      const nested = fs.readdirSync(full).find((n) => n.endsWith('.zip'));
      if (nested) return path.join(full, nested);
    }
  }
  return null;
}

function getUpdateZipPath(autoUpdater, homeDir) {
  const helper = autoUpdater.downloadedUpdateHelper;
  const candidates = [
    helper?.packageFile,
    helper?.file,
    helper?.downloadPath,
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  return findZipInCache(homeDir);
}

/**
 * Instala la actualización en macOS sin Squirrel (apps sin firmar).
 * Lanza un script que espera a que la app cierre, extrae el zip y copia sobre el .app.
 */
function installMacUpdate({ autoUpdater, app }) {
  const zipPath = getUpdateZipPath(autoUpdater, app.getPath('home'));
  if (!zipPath) {
    console.warn('[update] No se encontró el zip descargado en caché');
    return false;
  }

  const appBundle = getAppBundlePath();
  const scriptPath = path.join(app.getPath('temp'), `cotizaciones-install-${Date.now()}.sh');
  const logPath = path.join(app.getPath('userData'), 'update-install.log');

  const script = `#!/bin/bash
set -e
LOG="${logPath.replace(/"/g, '\\"')}"
APP="${appBundle.replace(/"/g, '\\"')}"
ZIP="${zipPath.replace(/"/g, '\\"')}"
echo "$(date -Iseconds) Iniciando instalación manual" >> "$LOG"
echo "APP=$APP ZIP=$ZIP" >> "$LOG"
sleep 3
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
ditto -xk "$ZIP" "$TMP" >> "$LOG" 2>&1
NEW_APP=$(find "$TMP" -maxdepth 3 -name "*.app" -type d | head -1)
if [ -z "$NEW_APP" ]; then
  echo "No se encontró .app en el zip" >> "$LOG"
  exit 1
fi
xattr -dr com.apple.quarantine "$NEW_APP" 2>/dev/null || true
ditto "$NEW_APP/" "$APP/" >> "$LOG" 2>&1
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
echo "$(date -Iseconds) Instalación completada" >> "$LOG"
open "$APP"
`;

  fs.writeFileSync(scriptPath, script, { mode: 0o755 });

  spawn('/bin/bash', [scriptPath], {
    detached: true,
    stdio: 'ignore',
  }).unref();

  app.removeAllListeners('window-all-closed');
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.destroy();
  });

  setTimeout(() => app.exit(0), 300);
  return true;
}

module.exports = { installMacUpdate, getUpdateZipPath, CACHE_DIR_NAME };
