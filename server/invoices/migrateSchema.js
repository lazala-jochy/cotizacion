/** Esquema de facturación fiscal (tablas independientes de cotizaciones). */
function migrateInvoicingSchema(db) {
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quote_id INTEGER,
      fiscal_range_id INTEGER NOT NULL,
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
  `);
}

module.exports = { migrateInvoicingSchema };
