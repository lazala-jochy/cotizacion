const { getStoredLicense } = require('./licenseStore');
const { refreshFromServer, hasValidLicense } = require('./licenseService');
const { needsLicenseSync } = require('./licenseSyncPolicy');

const HOUR_MS = 60 * 60 * 1000;

async function runSyncIfNeeded(source = 'scheduled') {
  const row = getStoredLicense();
  if (!needsLicenseSync(row)) return null;
  return refreshFromServer(source);
}

function startLicenseScheduler() {
  const tick = async () => {
    if (!hasValidLicense()) return;
    try {
      await runSyncIfNeeded('scheduled');
    } catch (err) {
      console.warn('[license] sincronización programada:', err.message);
    }
  };

  tick();
  const timer = setInterval(tick, HOUR_MS);
  timer.unref?.();

  return () => clearInterval(timer);
}

module.exports = {
  needsLicenseSync,
  runSyncIfNeeded,
  startLicenseScheduler,
};
