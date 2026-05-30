const db = require('../db');

function rowToRange(row) {
  if (!row) return null;
  return {
    ...row,
    numero_inicial: Number(row.numero_inicial),
    numero_final: Number(row.numero_final),
    ultimo_numero_utilizado: Number(row.ultimo_numero_utilizado),
  };
}

function listByUser(userId) {
  return db
    .prepare(
      `SELECT * FROM fiscal_ranges WHERE user_id = ? ORDER BY estado DESC, updated_at DESC`
    )
    .all(userId)
    .map(rowToRange);
}

function getById(id, userId) {
  return rowToRange(
    db.prepare('SELECT * FROM fiscal_ranges WHERE id = ? AND user_id = ?').get(id, userId)
  );
}

function getActiveRange(userId) {
  return rowToRange(
    db
      .prepare(
        `SELECT * FROM fiscal_ranges WHERE user_id = ? AND estado = 'activo'
         ORDER BY id DESC LIMIT 1`
      )
      .get(userId)
  );
}

function create(userId, data) {
  if (data.estado === 'activo') {
    db.prepare(`UPDATE fiscal_ranges SET estado = 'inactivo', updated_at = datetime('now') WHERE user_id = ?`).run(
      userId
    );
  }
  const result = db
    .prepare(
      `INSERT INTO fiscal_ranges (
        user_id, tipo_comprobante, serie, prefijo, numero_inicial, numero_final,
        ultimo_numero_utilizado, fecha_vencimiento, estado, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      userId,
      data.tipo_comprobante?.trim() || 'Factura de crédito fiscal',
      data.serie.trim().toUpperCase(),
      data.prefijo?.trim() || null,
      Number(data.numero_inicial),
      Number(data.numero_final),
      Number(data.ultimo_numero_utilizado ?? data.numero_inicial - 1) || 0,
      data.fecha_vencimiento || null,
      data.estado || 'activo'
    );
  return getById(result.lastInsertRowid, userId);
}

function update(id, userId, data) {
  const existing = getById(id, userId);
  if (!existing) return null;

  if (data.estado === 'activo' && existing.estado !== 'activo') {
    db.prepare(`UPDATE fiscal_ranges SET estado = 'inactivo', updated_at = datetime('now') WHERE user_id = ? AND id != ?`).run(
      userId,
      id
    );
  }

  db.prepare(
    `UPDATE fiscal_ranges SET
      tipo_comprobante = ?,
      serie = ?,
      prefijo = ?,
      numero_inicial = ?,
      numero_final = ?,
      ultimo_numero_utilizado = ?,
      fecha_vencimiento = ?,
      estado = ?,
      updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    data.tipo_comprobante?.trim() || existing.tipo_comprobante,
    (data.serie ?? existing.serie).trim().toUpperCase(),
    data.prefijo !== undefined ? data.prefijo?.trim() || null : existing.prefijo,
    data.numero_inicial !== undefined ? Number(data.numero_inicial) : existing.numero_inicial,
    data.numero_final !== undefined ? Number(data.numero_final) : existing.numero_final,
    data.ultimo_numero_utilizado !== undefined ?
      Number(data.ultimo_numero_utilizado)
    : existing.ultimo_numero_utilizado,
    data.fecha_vencimiento !== undefined ? data.fecha_vencimiento : existing.fecha_vencimiento,
    data.estado ?? existing.estado,
    id,
    userId
  );
  return getById(id, userId);
}

module.exports = {
  listByUser,
  getById,
  getActiveRange,
  create,
  update,
};
