const { seedFiscalDocumentTypes, resolveDocumentTypeId } = require('./fiscalDocumentTypesSeed');
const { syncAllSequencesToLegacyRanges } = require('./fiscalLegacyMirror');

/** Esquema de facturación fiscal (tablas independientes de cotizaciones). */
function migrateInvoicingSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fiscal_document_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      requires_tax_id INTEGER NOT NULL DEFAULT 0,
      is_electronic INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      CHECK (requires_tax_id IN (0, 1)),
      CHECK (is_electronic IN (0, 1)),
      CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS fiscal_ranges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tipo_comprobante TEXT NOT NULL DEFAULT 'Factura de crédito fiscal',
      serie TEXT NOT NULL,
      prefijo TEXT,
      numero_inicial INTEGER NOT NULL,
      numero_final INTEGER NOT NULL,
      ultimo_numero_utilizado INTEGER NOT NULL DEFAULT 0,
      fecha_vencimiento TEXT,
      estado TEXT NOT NULL DEFAULT 'activo',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (numero_inicial >= 0),
      CHECK (numero_final >= numero_inicial),
      CHECK (ultimo_numero_utilizado >= 0),
      CHECK (estado IN ('activo', 'inactivo'))
    );

    CREATE TABLE IF NOT EXISTS fiscal_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fiscal_document_type_id INTEGER NOT NULL,
      start_number INTEGER NOT NULL,
      end_number INTEGER NOT NULL,
      last_used_number INTEGER NOT NULL DEFAULT 0,
      expiration_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (fiscal_document_type_id) REFERENCES fiscal_document_types(id),
      CHECK (start_number >= 0),
      CHECK (end_number >= start_number),
      CHECK (last_used_number >= 0),
      CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quote_id INTEGER,
      fiscal_range_id INTEGER,
      numero TEXT NOT NULL,
      fiscal_number TEXT NOT NULL,
      serie TEXT NOT NULL,
      secuencia INTEGER NOT NULL,
      fecha_emision TEXT NOT NULL,
      fecha_vencimiento TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      client_nombre TEXT,
      client_rnc TEXT,
      client_direccion TEXT,
      client_telefono TEXT,
      client_email TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      itbis REAL NOT NULL DEFAULT 0,
      descuento REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      itbis_rate REAL DEFAULT 18,
      itbis_manual INTEGER DEFAULT 0,
      notas TEXT,
      ejecutivo TEXT,
      forma_pago TEXT,
      monto_pagado REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
      FOREIGN KEY (fiscal_range_id) REFERENCES fiscal_ranges(id),
      CHECK (estado IN ('pendiente', 'pagada', 'parcial', 'vencida', 'anulada'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL DEFAULT 1,
      precio_unitario REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      orden INTEGER DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoice_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_nombre TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_fiscal_number
      ON invoices(user_id, fiscal_number);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_numero
      ON invoices(user_id, numero);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_quote_id
      ON invoices(quote_id) WHERE quote_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_invoices_user_estado ON invoices(user_id, estado);
    CREATE INDEX IF NOT EXISTS idx_fiscal_ranges_user ON fiscal_ranges(user_id);
    CREATE INDEX IF NOT EXISTS idx_fiscal_sequences_user_type
      ON fiscal_sequences(user_id, fiscal_document_type_id);
  `);

  seedFiscalDocumentTypes(db);
  ensureInvoiceFiscalColumns(db);
  migrateLegacyFiscalRangesToSequences(db);
  syncAllSequencesToLegacyRanges(db);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_invoices_user_doc_type
      ON invoices(user_id, fiscal_document_type_id);
  `);
}

function tableHasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function ensureInvoiceFiscalColumns(db) {
  if (!tableHasColumn(db, 'invoices', 'fiscal_sequence_id')) {
    db.exec(`ALTER TABLE invoices ADD COLUMN fiscal_sequence_id INTEGER`);
  }
  if (!tableHasColumn(db, 'invoices', 'fiscal_document_type_id')) {
    db.exec(`ALTER TABLE invoices ADD COLUMN fiscal_document_type_id INTEGER`);
  }

  db.exec(`
    UPDATE invoices
    SET fiscal_sequence_id = fiscal_range_id
    WHERE fiscal_sequence_id IS NULL AND fiscal_range_id IS NOT NULL
  `);

  db.exec(`
    UPDATE invoices
    SET fiscal_document_type_id = (
      SELECT fs.fiscal_document_type_id FROM fiscal_sequences fs WHERE fs.id = invoices.fiscal_sequence_id
    )
    WHERE fiscal_document_type_id IS NULL AND fiscal_sequence_id IS NOT NULL
  `);

  db.exec(`
    UPDATE invoices
    SET fiscal_document_type_id = (
      SELECT id FROM fiscal_document_types WHERE code = UPPER(invoices.serie)
    )
    WHERE fiscal_document_type_id IS NULL AND serie IS NOT NULL
  `);
}

function migrateLegacyFiscalRangesToSequences(db) {
  const rangeCount = db.prepare('SELECT COUNT(*) AS c FROM fiscal_ranges').get().c;
  const seqCount = db.prepare('SELECT COUNT(*) AS c FROM fiscal_sequences').get().c;
  if (rangeCount === 0 || seqCount > 0) return;

  const ranges = db.prepare('SELECT * FROM fiscal_ranges ORDER BY id').all();
  const insert = db.prepare(
    `INSERT INTO fiscal_sequences (
      id, user_id, fiscal_document_type_id, start_number, end_number, last_used_number,
      expiration_date, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const r of ranges) {
    let typeId = resolveDocumentTypeId(db, r.serie);
    if (!typeId) {
      typeId = resolveDocumentTypeId(db, 'B02');
    }
    insert.run(
      r.id,
      r.user_id,
      typeId,
      r.numero_inicial,
      r.numero_final,
      r.ultimo_numero_utilizado,
      r.fecha_vencimiento,
      r.estado === 'activo' ? 1 : 0,
      r.created_at,
      r.updated_at
    );
  }

  db.exec(`
    UPDATE invoices
    SET fiscal_sequence_id = fiscal_range_id,
        fiscal_document_type_id = (
          SELECT fs.fiscal_document_type_id FROM fiscal_sequences fs
          WHERE fs.id = invoices.fiscal_range_id
        )
    WHERE fiscal_sequence_id IS NULL AND fiscal_range_id IS NOT NULL
  `);
}

module.exports = { migrateInvoicingSchema };
