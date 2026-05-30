const db = require('../db');
const { createDefaultTemplateDefinition } = require('../../shared/template-designer/dist/defaultTemplate');
const { normalizeTemplateDefinition } = require('../../shared/template-designer/dist/normalizeTemplateDefinition');

function parseDefinition(raw) {
  if (!raw) return createDefaultTemplateDefinition();
  try {
    const def = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (def?.version === 1 && Array.isArray(def.elements)) return def;
  } catch {
    /* fallback */
  }
  return createDefaultTemplateDefinition();
}

function rowToRecord(row) {
  if (!row) return null;
  const definition = normalizeTemplateDefinition(parseDefinition(row.definition_json));
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    is_default: Boolean(row.is_default),
    definition,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function listByUser(userId) {
  const rows = db
    .prepare(
      `SELECT * FROM quote_templates WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC`
    )
    .all(userId);
  return rows.map(rowToRecord);
}

function getById(id, userId) {
  const row = db
    .prepare('SELECT * FROM quote_templates WHERE id = ? AND user_id = ?')
    .get(id, userId);
  return rowToRecord(row);
}

function getDefault(userId) {
  let row = db
    .prepare('SELECT * FROM quote_templates WHERE user_id = ? AND is_default = 1 LIMIT 1')
    .get(userId);
  if (!row) {
    row = db
      .prepare('SELECT * FROM quote_templates WHERE user_id = ? ORDER BY id ASC LIMIT 1')
      .get(userId);
  }
  if (!row) return null;
  return rowToRecord(row);
}

function clearDefault(userId) {
  db.prepare('UPDATE quote_templates SET is_default = 0 WHERE user_id = ?').run(userId);
}

function create(userId, { name, definition, isDefault = false }) {
  if (isDefault) clearDefault(userId);
  const json = JSON.stringify(definition);
  const result = db
    .prepare(
      `INSERT INTO quote_templates (user_id, name, is_default, definition_json, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .run(userId, name.trim(), isDefault ? 1 : 0, json);
  return getById(result.lastInsertRowid, userId);
}

function update(id, userId, { name, definition, isDefault }) {
  const existing = getById(id, userId);
  if (!existing) return null;

  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextDef = definition !== undefined ? definition : existing.definition;
  let nextDefault = isDefault !== undefined ? Boolean(isDefault) : existing.is_default;

  if (nextDefault) clearDefault(userId);
  else if (existing.is_default) nextDefault = true;

  db.prepare(
    `UPDATE quote_templates SET name = ?, is_default = ?, definition_json = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(nextName, nextDefault ? 1 : 0, JSON.stringify(nextDef), id, userId);

  return getById(id, userId);
}

function duplicate(id, userId) {
  const source = getById(id, userId);
  if (!source) return null;
  return create(userId, {
    name: `${source.name} (copia)`,
    definition: JSON.parse(JSON.stringify(source.definition)),
    isDefault: false,
  });
}

function remove(id, userId) {
  const existing = getById(id, userId);
  if (!existing) return false;

  const wasDefault = existing.is_default;
  db.prepare('DELETE FROM quote_templates WHERE id = ? AND user_id = ?').run(id, userId);

  if (wasDefault) {
    const next = db
      .prepare('SELECT id FROM quote_templates WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1')
      .get(userId);
    if (next) {
      db.prepare('UPDATE quote_templates SET is_default = 1 WHERE id = ?').run(next.id);
    }
  }
  return true;
}

function setDefault(id, userId) {
  const existing = getById(id, userId);
  if (!existing) return null;
  clearDefault(userId);
  db.prepare(
    `UPDATE quote_templates SET is_default = 1, updated_at = datetime('now') WHERE id = ?`
  ).run(id);
  return getById(id, userId);
}

function ensureDefaultTemplate(userId) {
  const current = getDefault(userId);
  if (current) return current;
  return create(userId, {
    name: 'Plantilla predeterminada',
    definition: createDefaultTemplateDefinition(),
    isDefault: true,
  });
}

module.exports = {
  listByUser,
  getById,
  getDefault,
  create,
  update,
  duplicate,
  remove,
  setDefault,
  ensureDefaultTemplate,
  parseDefinition,
};
