const db = require('../db');

function getStoredLicense() {
  return db.prepare('SELECT * FROM app_license WHERE id = 1').get() || null;
}

function saveLicense(record) {
  const existing = getStoredLicense();
  const modulesJson = JSON.stringify(record.modules || []);
  const syncAt = record.syncedAt || new Date().toISOString();

  if (existing) {
    db.prepare(
      `UPDATE app_license SET
        product_key = ?,
        machine_id = ?,
        modules_json = ?,
        customer_name = ?,
        expires_at = ?,
        last_license_sync = ?,
        updated_at = datetime('now')
      WHERE id = 1`
    ).run(
      record.productKey,
      record.machineId,
      modulesJson,
      record.customerName || null,
      record.expiresAt || null,
      syncAt
    );
  } else {
    db.prepare(
      `INSERT INTO app_license (
        id, product_key, machine_id, modules_json, customer_name, expires_at, last_license_sync
      ) VALUES (1, ?, ?, ?, ?, ?, ?)`
    ).run(
      record.productKey,
      record.machineId,
      modulesJson,
      record.customerName || null,
      record.expiresAt || null,
      syncAt
    );
  }
}

function clearLicense() {
  db.prepare('DELETE FROM app_license WHERE id = 1').run();
}

module.exports = {
  getStoredLicense,
  saveLicense,
  clearLicense,
};
