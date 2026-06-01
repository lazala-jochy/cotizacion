const db = require('../db');
const fiscalSequenceRepo = require('./fiscalSequenceRepository');
const { ensureLegacyFiscalRangeMirror } = require('./fiscalLegacyMirror');

function rowToInvoice(row) {
  if (!row) return null;
  return {
    ...row,
    subtotal: Number(row.subtotal),
    itbis: Number(row.itbis),
    descuento: Number(row.descuento),
    total: Number(row.total),
    monto_pagado: Number(row.monto_pagado),
    itbis_rate: Number(row.itbis_rate),
    itbis_manual: Number(row.itbis_manual),
  };
}

function getItems(invoiceId) {
  return db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY orden, id')
    .all(invoiceId);
}

function getById(id, userId) {
  const row = db
    .prepare(
      `SELECT i.*, q.numero AS quote_numero,
        dt.code AS document_type_code,
        dt.name AS document_type_name
       FROM invoices i
       LEFT JOIN quotes q ON q.id = i.quote_id
       LEFT JOIN fiscal_document_types dt ON dt.id = i.fiscal_document_type_id
       WHERE i.id = ? AND i.user_id = ?`
    )
    .get(id, userId);
  if (!row) return null;
  const invoice = rowToInvoice(row);
  invoice.items = getItems(id);
  return invoice;
}

function listByUser(userId, filters = {}) {
  let sql = `SELECT i.*, q.numero AS quote_numero,
    dt.code AS document_type_code,
    dt.name AS document_type_name
    FROM invoices i
    LEFT JOIN quotes q ON q.id = i.quote_id
    LEFT JOIN fiscal_document_types dt ON dt.id = i.fiscal_document_type_id
    WHERE i.user_id = ?`;
  const params = [userId];

  if (filters.estado) {
    sql += ' AND i.estado = ?';
    params.push(filters.estado);
  }
  if (filters.fiscal_document_type_id) {
    sql += ' AND i.fiscal_document_type_id = ?';
    params.push(Number(filters.fiscal_document_type_id));
  }
  if (filters.search?.trim()) {
    sql += ` AND (
      i.fiscal_number LIKE ? OR i.numero LIKE ? OR i.client_nombre LIKE ? OR i.client_rnc LIKE ?
    )`;
    const q = `%${filters.search.trim()}%`;
    params.push(q, q, q, q);
  }
  sql += ' ORDER BY i.created_at DESC';
  return db.prepare(sql).all(...params).map(rowToInvoice);
}

function getByQuoteId(quoteId, userId) {
  return rowToInvoice(
    db.prepare('SELECT * FROM invoices WHERE quote_id = ? AND user_id = ?').get(quoteId, userId)
  );
}

function nextInternalNumber(userId) {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const last = db
    .prepare(
      `SELECT numero FROM invoices WHERE user_id = ? AND numero LIKE ? ORDER BY id DESC LIMIT 1`
    )
    .get(userId, `${prefix}%`);
  let seq = 1;
  if (last?.numero) {
    const part = parseInt(last.numero.replace(prefix, ''), 10);
    if (!Number.isNaN(part)) seq = part + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function insertInvoiceWithItems(invoiceRow, items) {
  const insertInvoice = db.prepare(
    `INSERT INTO invoices (
      user_id, quote_id, fiscal_range_id, fiscal_sequence_id, fiscal_document_type_id,
      numero, fiscal_number, serie, secuencia,
      fecha_emision, fecha_vencimiento, estado,
      client_nombre, client_rnc, client_direccion, client_telefono, client_email,
      subtotal, itbis, descuento, total, itbis_rate, itbis_manual,
      notas, ejecutivo, forma_pago, monto_pagado, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, datetime('now')
    )`
  );

  const insertItem = db.prepare(
    `INSERT INTO invoice_items (invoice_id, descripcion, cantidad, precio_unitario, costo_unitario, total, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const run = db.transaction(() => {
    const fiscalSequenceId =
      invoiceRow.fiscal_sequence_id ?? invoiceRow.fiscal_range_id ?? null;
    let fiscalRangeId = null;
    if (fiscalSequenceId) {
      const sequence = fiscalSequenceRepo.getById(fiscalSequenceId, invoiceRow.user_id);
      if (sequence) {
        fiscalRangeId = ensureLegacyFiscalRangeMirror(sequence);
      } else {
        const legacy = db
          .prepare('SELECT id FROM fiscal_ranges WHERE id = ? AND user_id = ?')
          .get(fiscalSequenceId, invoiceRow.user_id);
        fiscalRangeId = legacy?.id ?? null;
      }
    }

    const result = insertInvoice.run(
      invoiceRow.user_id,
      invoiceRow.quote_id ?? null,
      fiscalRangeId,
      fiscalSequenceId,
      invoiceRow.fiscal_document_type_id,
      invoiceRow.numero,
      invoiceRow.fiscal_number,
      invoiceRow.serie,
      invoiceRow.secuencia,
      invoiceRow.fecha_emision,
      invoiceRow.fecha_vencimiento ?? null,
      invoiceRow.estado,
      invoiceRow.client_nombre,
      invoiceRow.client_rnc,
      invoiceRow.client_direccion,
      invoiceRow.client_telefono,
      invoiceRow.client_email,
      invoiceRow.subtotal,
      invoiceRow.itbis,
      invoiceRow.descuento,
      invoiceRow.total,
      invoiceRow.itbis_rate,
      invoiceRow.itbis_manual,
      invoiceRow.notas,
      invoiceRow.ejecutivo,
      invoiceRow.forma_pago,
      invoiceRow.monto_pagado ?? 0
    );
    const invoiceId = result.lastInsertRowid;
    items.forEach((item, idx) => {
      const qty = Number(item.cantidad) || 0;
      const unit = Number(item.precio_unitario) || 0;
      const lineTotal = item.total != null ? Number(item.total) : qty * unit;
      const cost = Math.max(0, Number(item.costo_unitario) || 0);
      insertItem.run(
        invoiceId,
        item.descripcion,
        qty,
        unit,
        cost,
        lineTotal,
        item.orden ?? idx
      );
    });
    return invoiceId;
  });

  return run();
}

function fiscalNumberExists(userId, fiscalNumber, excludeInvoiceId = null) {
  if (excludeInvoiceId != null) {
    const row = db
      .prepare(
        `SELECT id FROM invoices WHERE user_id = ? AND fiscal_number = ? AND id != ?`
      )
      .get(userId, fiscalNumber, excludeInvoiceId);
    return Boolean(row);
  }
  const row = db
    .prepare('SELECT id FROM invoices WHERE user_id = ? AND fiscal_number = ?')
    .get(userId, fiscalNumber);
  return Boolean(row);
}

function updateInvoiceWithItems(id, userId, invoicePatch, items) {
  const existing = getById(id, userId);
  if (!existing) return null;

  const run = db.transaction(() => {
    const sets = [
      'fecha_emision = ?',
      'fecha_vencimiento = ?',
      'estado = ?',
      'client_nombre = ?',
      'client_rnc = ?',
      'client_direccion = ?',
      'client_telefono = ?',
      'client_email = ?',
      'subtotal = ?',
      'itbis = ?',
      'descuento = ?',
      'total = ?',
      'itbis_rate = ?',
      'itbis_manual = ?',
      'notas = ?',
      'ejecutivo = ?',
      'forma_pago = ?',
      'monto_pagado = ?',
      'updated_at = datetime(\'now\')',
    ];
    const params = [
      invoicePatch.fecha_emision,
      invoicePatch.fecha_vencimiento ?? null,
      invoicePatch.estado,
      invoicePatch.client_nombre,
      invoicePatch.client_rnc,
      invoicePatch.client_direccion,
      invoicePatch.client_telefono,
      invoicePatch.client_email,
      invoicePatch.subtotal,
      invoicePatch.itbis,
      invoicePatch.descuento,
      invoicePatch.total,
      invoicePatch.itbis_rate,
      invoicePatch.itbis_manual,
      invoicePatch.notas,
      invoicePatch.ejecutivo,
      invoicePatch.forma_pago,
      invoicePatch.monto_pagado ?? existing.monto_pagado,
    ];

    if (invoicePatch.fiscal_number != null) {
      const insertAt = sets.length - 1;
      sets.splice(insertAt, 0, 'fiscal_number = ?', 'serie = ?', 'secuencia = ?');
      params.splice(
        insertAt,
        0,
        invoicePatch.fiscal_number,
        invoicePatch.serie,
        invoicePatch.secuencia
      );
    }

    params.push(id, userId);
    db.prepare(
      `UPDATE invoices SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...params);
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    const insertItem = db.prepare(
      `INSERT INTO invoice_items (invoice_id, descripcion, cantidad, precio_unitario, total, orden)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    items.forEach((item, idx) => {
      const qty = Number(item.cantidad) || 0;
      const unit = Number(item.precio_unitario) || 0;
      const lineTotal = item.total != null ? Number(item.total) : qty * unit;
      const cost = Math.max(0, Number(item.costo_unitario) || 0);
      insertItem.run(id, item.descripcion, qty, unit, cost, lineTotal, item.orden ?? idx);
    });
  });

  run();
  return getById(id, userId);
}

function remove(id, userId) {
  const existing = getById(id, userId);
  if (!existing) return false;
  if (existing.estado === 'anulada') {
    db.prepare('DELETE FROM invoices WHERE id = ? AND user_id = ?').run(id, userId);
    return true;
  }
  return false;
}

module.exports = {
  getById,
  listByUser,
  getByQuoteId,
  nextInternalNumber,
  fiscalNumberExists,
  insertInvoiceWithItems,
  updateInvoiceWithItems,
  remove,
};
