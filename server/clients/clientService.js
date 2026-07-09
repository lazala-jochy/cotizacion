const db = require('../db');

function normalizeRnc(rnc) {
  return String(rnc || '')
    .replace(/\D/g, '')
    .trim();
}

function normalizeName(name) {
  return String(name || '').trim();
}

function snapshotFields(snapshot) {
  return {
    nombre: normalizeName(snapshot.nombre ?? snapshot.client_nombre),
    rnc: normalizeName(snapshot.rnc ?? snapshot.client_rnc) || null,
    direccion: normalizeName(snapshot.direccion ?? snapshot.client_direccion) || null,
    telefono: normalizeName(snapshot.telefono ?? snapshot.client_telefono) || null,
    email: normalizeName(snapshot.email ?? snapshot.client_email) || null,
  };
}

function findClientByRnc(userId, rnc) {
  const target = normalizeRnc(rnc);
  if (!target) return null;
  const rows = db.prepare('SELECT * FROM clients WHERE user_id = ?').all(userId);
  return rows.find((c) => normalizeRnc(c.rnc) === target) || null;
}

function findClientByName(userId, nombre) {
  const name = normalizeName(nombre).toLowerCase();
  if (!name) return null;
  return db
    .prepare(
      `SELECT * FROM clients WHERE user_id = ? AND LOWER(TRIM(nombre)) = ? LIMIT 1`
    )
    .get(userId, name);
}

function mergeClientFields(existing, incoming) {
  return {
    nombre: incoming.nombre || existing.nombre,
    rnc: incoming.rnc || existing.rnc || null,
    direccion: incoming.direccion || existing.direccion || null,
    telefono: incoming.telefono || existing.telefono || null,
    email: incoming.email || existing.email || null,
  };
}

function updateClient(userId, clientId, fields) {
  db.prepare(
    `UPDATE clients SET nombre = ?, rnc = ?, direccion = ?, telefono = ?, email = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    fields.nombre,
    fields.rnc,
    fields.direccion,
    fields.telefono,
    fields.email,
    clientId,
    userId
  );
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
}

function createClient(userId, fields) {
  const result = db
    .prepare(
      `INSERT INTO clients (user_id, nombre, rnc, direccion, telefono, email)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      fields.nombre,
      fields.rnc,
      fields.direccion,
      fields.telefono,
      fields.email
    );
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Busca cliente por RNC (prioridad) o nombre; si no existe, lo crea.
 * @returns {{ id: number, client: object } | null}
 */
function resolveOrCreateClient(userId, snapshot) {
  const incoming = snapshotFields(snapshot);
  if (!incoming.nombre) return null;

  let existing = null;
  if (incoming.rnc) {
    existing = findClientByRnc(userId, incoming.rnc);
  }
  if (!existing) {
    existing = findClientByName(userId, incoming.nombre);
  }

  if (existing) {
    const merged = mergeClientFields(existing, incoming);
    const changed =
      merged.nombre !== existing.nombre ||
      (merged.rnc && merged.rnc !== existing.rnc) ||
      (merged.direccion && merged.direccion !== (existing.direccion || '')) ||
      (merged.telefono && merged.telefono !== (existing.telefono || '')) ||
      (merged.email && merged.email !== (existing.email || ''));

    const client = changed ? updateClient(userId, existing.id, merged) : existing;
    return { id: client.id, client };
  }

  const client = createClient(userId, incoming);
  return { id: client.id, client };
}

module.exports = {
  normalizeRnc,
  normalizeName,
  resolveOrCreateClient,
  findClientByRnc,
  findClientByName,
};
