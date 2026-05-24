async function shutdownForUpdate() {
  try {
    const { stopServer } = require('../server/index.js');
    await stopServer();
  } catch (err) {
    console.error('[shutdown] servidor:', err.message);
  }

  try {
    const db = require('../server/db');
    if (typeof db.close === 'function') db.close();
  } catch (err) {
    console.error('[shutdown] base de datos:', err.message);
  }
}

module.exports = { shutdownForUpdate };
