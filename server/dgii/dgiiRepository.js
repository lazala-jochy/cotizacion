const db = require('../db');

function insertReport(userId, reportType, period, filePath, recordCount) {
  const result = db
    .prepare(
      `INSERT INTO dgii_reports (user_id, report_type, period, file_path, record_count, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(userId, reportType, period, filePath, recordCount);
  return getReportById(result.lastInsertRowid, userId);
}

function getReportById(id, userId) {
  return db
    .prepare('SELECT * FROM dgii_reports WHERE id = ? AND user_id = ?')
    .get(id, userId);
}

function listReports(userId, filters = {}) {
  let sql = 'SELECT * FROM dgii_reports WHERE user_id = ?';
  const params = [userId];
  if (filters.report_type) {
    sql += ' AND report_type = ?';
    params.push(filters.report_type);
  }
  sql += ' ORDER BY generated_at DESC LIMIT 100';
  return db.prepare(sql).all(...params);
}

function upsertCancelledInvoice(userId, invoiceId, cancelReason, cancelledAt) {
  db.prepare(
    `INSERT INTO cancelled_invoices (user_id, invoice_id, cancel_reason, cancelled_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(invoice_id) DO UPDATE SET
       cancel_reason = excluded.cancel_reason,
       cancelled_at = excluded.cancelled_at,
       updated_at = datetime('now')`
  ).run(userId, invoiceId, cancelReason, cancelledAt);
}

function listSuppliers(userId) {
  return db
    .prepare('SELECT * FROM dgii_suppliers WHERE user_id = ? ORDER BY nombre')
    .all(userId);
}

function getSupplier(id, userId) {
  return db.prepare('SELECT * FROM dgii_suppliers WHERE id = ? AND user_id = ?').get(id, userId);
}

function createSupplier(userId, data) {
  const result = db
    .prepare(
      `INSERT INTO dgii_suppliers (user_id, nombre, rnc, cedula, tipo_identificacion, email, telefono, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      userId,
      data.nombre.trim(),
      data.rnc?.trim() || null,
      data.cedula?.trim() || null,
      data.tipo_identificacion || '1',
      data.email?.trim() || null,
      data.telefono?.trim() || null
    );
  return getSupplier(result.lastInsertRowid, userId);
}

function listPurchases(userId, period) {
  const { periodDateRange } = require('./utils/validatePeriod');
  const { start, end } = periodDateRange(period);
  return db
    .prepare(
      `SELECT p.*, s.nombre AS supplier_nombre
       FROM dgii_purchases p
       LEFT JOIN dgii_suppliers s ON s.id = p.supplier_id
       WHERE p.user_id = ? AND p.fecha_comprobante >= ? AND p.fecha_comprobante <= ?
       ORDER BY p.fecha_comprobante DESC`
    )
    .all(userId, start, end);
}

function getPurchase(id, userId) {
  return db.prepare('SELECT * FROM dgii_purchases WHERE id = ? AND user_id = ?').get(id, userId);
}

function createPurchase(userId, data) {
  const result = db
    .prepare(
      `INSERT INTO dgii_purchases (
        user_id, supplier_id, ncf, ncf_modificado, tipo_bienes_servicios, tipo_identificacion,
        supplier_rnc, supplier_cedula, fecha_comprobante, fecha_pago,
        monto_facturado, itbis_facturado, itbis_retenido, isr_retenido, forma_pago, notas, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      userId,
      data.supplier_id ?? null,
      data.ncf.trim().toUpperCase(),
      data.ncf_modificado?.trim().toUpperCase() || null,
      data.tipo_bienes_servicios || '02',
      data.tipo_identificacion || '1',
      data.supplier_rnc?.trim() || null,
      data.supplier_cedula?.trim() || null,
      data.fecha_comprobante,
      data.fecha_pago || null,
      Number(data.monto_facturado) || 0,
      Number(data.itbis_facturado) || 0,
      Number(data.itbis_retenido) || 0,
      Number(data.isr_retenido) || 0,
      data.forma_pago?.trim() || null,
      data.notas?.trim() || null
    );
  return getPurchase(result.lastInsertRowid, userId);
}

function removePurchase(id, userId) {
  const r = db.prepare('DELETE FROM dgii_purchases WHERE id = ? AND user_id = ?').run(id, userId);
  return r.changes > 0;
}

module.exports = {
  insertReport,
  getReportById,
  listReports,
  upsertCancelledInvoice,
  listSuppliers,
  getSupplier,
  createSupplier,
  listPurchases,
  getPurchase,
  createPurchase,
  removePurchase,
};
