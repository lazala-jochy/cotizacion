const db = require('../db');

function log(invoiceId, userId, userNombre, action, details = null) {
  db.prepare(
    `INSERT INTO invoice_audit_log (invoice_id, user_id, user_nombre, action, details)
     VALUES (?, ?, ?, ?, ?)`
  ).run(invoiceId, userId, userNombre || null, action, details ? JSON.stringify(details) : null);
}

function listByInvoice(invoiceId) {
  return db
    .prepare(
      `SELECT * FROM invoice_audit_log WHERE invoice_id = ? ORDER BY created_at DESC, id DESC`
    )
    .all(invoiceId)
    .map((row) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
    }));
}

module.exports = { log, listByInvoice };
