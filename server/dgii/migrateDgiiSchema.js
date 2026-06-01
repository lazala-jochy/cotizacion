/** Esquema DGII: reportes, anulaciones, compras (606). */
function migrateDgiiSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dgii_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      report_type TEXT NOT NULL CHECK (report_type IN ('606', '607', '608')),
      period TEXT NOT NULL,
      file_path TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dgii_reports_user_period
      ON dgii_reports(user_id, report_type, period);

    CREATE TABLE IF NOT EXISTS cancelled_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL UNIQUE,
      cancel_reason TEXT NOT NULL,
      cancelled_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dgii_suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      rnc TEXT,
      cedula TEXT,
      tipo_identificacion TEXT NOT NULL DEFAULT '1',
      email TEXT,
      telefono TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dgii_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      supplier_id INTEGER,
      ncf TEXT NOT NULL,
      ncf_modificado TEXT,
      tipo_bienes_servicios TEXT NOT NULL DEFAULT '02',
      tipo_identificacion TEXT NOT NULL DEFAULT '1',
      supplier_rnc TEXT,
      supplier_cedula TEXT,
      fecha_comprobante TEXT NOT NULL,
      fecha_pago TEXT,
      monto_facturado REAL NOT NULL DEFAULT 0,
      itbis_facturado REAL NOT NULL DEFAULT 0,
      itbis_retenido REAL NOT NULL DEFAULT 0,
      isr_retenido REAL NOT NULL DEFAULT 0,
      forma_pago TEXT,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES dgii_suppliers(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dgii_purchases_user_period
      ON dgii_purchases(user_id, fecha_comprobante);
  `);
}

module.exports = { migrateDgiiSchema };
