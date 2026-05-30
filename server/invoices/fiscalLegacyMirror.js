/** Evita dependencia circular con db.js (require diferido). */
function getDb(database) {
  return database || require('../db');
}

/**
 * La tabla legacy `fiscal_ranges` mantiene FK en `invoices.fiscal_range_id`.
 * Cada secuencia fiscal nueva debe tener su espejo para no romper inserts.
 */
function ensureLegacyFiscalRangeMirror(sequence, database) {
  if (!sequence?.id) return null;
  const db = getDb(database);

  const exists = db.prepare('SELECT 1 FROM fiscal_ranges WHERE id = ?').get(sequence.id);
  if (exists) return sequence.id;

  const code = sequence.document_type_code || sequence.serie || 'B02';
  const name = sequence.document_type_name || sequence.tipo_comprobante || code;
  const isActive =
    sequence.is_active === true ||
    sequence.is_active === 1 ||
    sequence.estado === 'activo';

  db.prepare(
    `INSERT INTO fiscal_ranges (
      id, user_id, tipo_comprobante, serie, prefijo,
      numero_inicial, numero_final, ultimo_numero_utilizado, fecha_vencimiento, estado, updated_at
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    sequence.id,
    sequence.user_id,
    name,
    code,
    Number(sequence.start_number ?? sequence.numero_inicial ?? 1),
    Number(sequence.end_number ?? sequence.numero_final ?? 99999999),
    Number(sequence.last_used_number ?? sequence.ultimo_numero_utilizado ?? 0),
    sequence.expiration_date ?? sequence.fecha_vencimiento ?? null,
    isActive ? 'activo' : 'inactivo'
  );

  return sequence.id;
}

function syncAllSequencesToLegacyRanges(database) {
  const db = getDb(database);
  const rows = db
    .prepare(
      `SELECT fs.*, dt.code AS document_type_code, dt.name AS document_type_name
       FROM fiscal_sequences fs
       JOIN fiscal_document_types dt ON dt.id = fs.fiscal_document_type_id
       WHERE NOT EXISTS (SELECT 1 FROM fiscal_ranges fr WHERE fr.id = fs.id)`
    )
    .all();

  for (const row of rows) {
    ensureLegacyFiscalRangeMirror(
      {
        id: row.id,
        user_id: row.user_id,
        document_type_code: row.document_type_code,
        document_type_name: row.document_type_name,
        start_number: row.start_number,
        end_number: row.end_number,
        last_used_number: row.last_used_number,
        expiration_date: row.expiration_date,
        is_active: row.is_active,
      },
      db
    );
  }
}

module.exports = { ensureLegacyFiscalRangeMirror, syncAllSequencesToLegacyRanges };
