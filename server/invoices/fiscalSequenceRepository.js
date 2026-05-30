const db = require('../db');
const { ensureLegacyFiscalRangeMirror } = require('./fiscalLegacyMirror');

const SEQUENCE_SELECT = `
  SELECT fs.*,
    dt.code AS document_type_code,
    dt.name AS document_type_name,
    dt.requires_tax_id AS document_type_requires_tax_id,
    dt.is_electronic AS document_type_is_electronic
  FROM fiscal_sequences fs
  JOIN fiscal_document_types dt ON dt.id = fs.fiscal_document_type_id
`;

function rowToSequence(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    fiscal_document_type_id: row.fiscal_document_type_id,
    start_number: Number(row.start_number),
    end_number: Number(row.end_number),
    last_used_number: Number(row.last_used_number),
    expiration_date: row.expiration_date,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    document_type_code: row.document_type_code,
    document_type_name: row.document_type_name,
    document_type_requires_tax_id: Boolean(row.document_type_requires_tax_id),
    document_type_is_electronic: Boolean(row.document_type_is_electronic),
    /** Alias para validadores heredados */
    serie: row.document_type_code,
    numero_inicial: Number(row.start_number),
    numero_final: Number(row.end_number),
    ultimo_numero_utilizado: Number(row.last_used_number),
    fecha_vencimiento: row.expiration_date,
    estado: row.is_active ? 'activo' : 'inactivo',
  };
}

function listByUser(userId) {
  return db
    .prepare(`${SEQUENCE_SELECT} WHERE fs.user_id = ? ORDER BY dt.code ASC, fs.is_active DESC, fs.updated_at DESC`)
    .all(userId)
    .map(rowToSequence);
}

function getById(id, userId) {
  return rowToSequence(
    db.prepare(`${SEQUENCE_SELECT} WHERE fs.id = ? AND fs.user_id = ?`).get(id, userId)
  );
}

function getActiveForDocumentType(userId, fiscalDocumentTypeId) {
  return rowToSequence(
    db
      .prepare(
        `${SEQUENCE_SELECT}
         WHERE fs.user_id = ? AND fs.fiscal_document_type_id = ? AND fs.is_active = 1
         ORDER BY fs.id DESC LIMIT 1`
      )
      .get(userId, fiscalDocumentTypeId)
  );
}

function deactivateSiblings(userId, fiscalDocumentTypeId, exceptId = null) {
  if (exceptId != null) {
    db.prepare(
      `UPDATE fiscal_sequences SET is_active = 0, updated_at = datetime('now')
       WHERE user_id = ? AND fiscal_document_type_id = ? AND id != ?`
    ).run(userId, fiscalDocumentTypeId, exceptId);
  } else {
    db.prepare(
      `UPDATE fiscal_sequences SET is_active = 0, updated_at = datetime('now')
       WHERE user_id = ? AND fiscal_document_type_id = ?`
    ).run(userId, fiscalDocumentTypeId);
  }
}

function create(userId, data) {
  const typeId = Number(data.fiscal_document_type_id);
  const isActive = data.is_active !== false && data.is_active !== 0;
  if (isActive) {
    deactivateSiblings(userId, typeId);
  }

  const result = db
    .prepare(
      `INSERT INTO fiscal_sequences (
        user_id, fiscal_document_type_id, start_number, end_number, last_used_number,
        expiration_date, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      userId,
      typeId,
      Number(data.start_number),
      Number(data.end_number),
      Number(data.last_used_number ?? Number(data.start_number) - 1) || 0,
      data.expiration_date || null,
      isActive ? 1 : 0
    );
  const created = getById(result.lastInsertRowid, userId);
  ensureLegacyFiscalRangeMirror(created);
  return created;
}

function update(id, userId, data) {
  const existing = getById(id, userId);
  if (!existing) return null;

  const typeId =
    data.fiscal_document_type_id !== undefined ?
      Number(data.fiscal_document_type_id)
    : existing.fiscal_document_type_id;

  const isActive =
    data.is_active !== undefined ?
      data.is_active !== false && data.is_active !== 0
    : existing.is_active;

  if (isActive) {
    deactivateSiblings(userId, typeId, id);
  }

  db.prepare(
    `UPDATE fiscal_sequences SET
      fiscal_document_type_id = ?,
      start_number = ?,
      end_number = ?,
      last_used_number = ?,
      expiration_date = ?,
      is_active = ?,
      updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    typeId,
    data.start_number !== undefined ? Number(data.start_number) : existing.start_number,
    data.end_number !== undefined ? Number(data.end_number) : existing.end_number,
    data.last_used_number !== undefined ?
      Number(data.last_used_number)
    : existing.last_used_number,
    data.expiration_date !== undefined ? data.expiration_date : existing.expiration_date,
    isActive ? 1 : 0,
    id,
    userId
  );
  const updated = getById(id, userId);
  ensureLegacyFiscalRangeMirror(updated);
  return updated;
}

module.exports = {
  listByUser,
  getById,
  getActiveForDocumentType,
  create,
  update,
};
