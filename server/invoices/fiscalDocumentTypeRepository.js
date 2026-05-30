const db = require('../db');

function rowToType(row) {
  if (!row) return null;
  return {
    ...row,
    requires_tax_id: Boolean(row.requires_tax_id),
    is_electronic: Boolean(row.is_electronic),
    is_active: Boolean(row.is_active),
  };
}

function listActive() {
  return db
    .prepare(
      `SELECT * FROM fiscal_document_types
       WHERE is_active = 1
       ORDER BY is_electronic ASC, code ASC`
    )
    .all()
    .map(rowToType);
}

function listAll() {
  return db
    .prepare('SELECT * FROM fiscal_document_types ORDER BY is_electronic ASC, code ASC')
    .all()
    .map(rowToType);
}

function getById(id) {
  return rowToType(db.prepare('SELECT * FROM fiscal_document_types WHERE id = ?').get(id));
}

function getByCode(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  if (!c) return null;
  return rowToType(db.prepare('SELECT * FROM fiscal_document_types WHERE code = ?').get(c));
}

module.exports = {
  listActive,
  listAll,
  getById,
  getByCode,
};
