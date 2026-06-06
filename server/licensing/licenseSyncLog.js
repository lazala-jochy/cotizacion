const db = require('../db');

function appendSyncLog({ productKey, machineId, modules, result, message, source }) {
  db.prepare(
    `INSERT INTO license_sync_log (
      product_key, machine_id, modules_json, result, message, source
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    productKey || '',
    machineId || '',
    JSON.stringify(modules || []),
    result,
    message || null,
    source || 'unknown'
  );
}

function getRecentSyncLogs(limit = 10) {
  return db
    .prepare(
      `SELECT id, synced_at, product_key, machine_id, modules_json, result, message, source
       FROM license_sync_log
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit)
    .map((row) => ({
      id: row.id,
      syncedAt: row.synced_at,
      productKey: row.product_key,
      machineId: row.machine_id,
      modules: JSON.parse(row.modules_json || '[]'),
      result: row.result,
      message: row.message,
      source: row.source,
    }));
}

module.exports = { appendSyncLog, getRecentSyncLogs };
