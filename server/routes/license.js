const express = require('express');
const {
  getStatus,
  activateProductKey,
  refreshFromServer,
  deactivate,
} = require('../licensing/licenseService');
const { runSyncIfNeeded } = require('../licensing/licenseScheduler');
const { getRecentSyncLogs } = require('../licensing/licenseSyncLog');
const { APP_MODULES } = require('../licensing/modules');

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json(getStatus());
});

router.get('/sync-log', (_req, res) => {
  res.json(getRecentSyncLogs(15));
});

router.get('/modules', (_req, res) => {
  res.json(APP_MODULES);
});

router.post('/activate', async (req, res) => {
  try {
    const status = await activateProductKey(req.body?.productKey);
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message, code: err.code });
  }
});

router.post('/refresh', async (_req, res) => {
  try {
    const status = await refreshFromServer('manual');
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message, code: err.code });
  }
});

router.post('/sync-scheduled', async (_req, res) => {
  try {
    const status = (await runSyncIfNeeded('scheduled')) || getStatus();
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message, code: err.code });
  }
});

router.post('/deactivate', (_req, res) => {
  res.json(deactivate());
});

module.exports = router;
