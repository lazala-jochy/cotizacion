const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

function getDbPath() {
  const base =
    process.env.COTIZACION_DATA_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || '.', '.cotizaciones-app');
  fs.mkdirSync(base, { recursive: true });
  return path.join(base, 'cotizaciones.db');
}

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    replaced_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    rnc TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client_id INTEGER,
    numero TEXT NOT NULL,
    fecha TEXT NOT NULL,
    validez_dias INTEGER DEFAULT 30,
    notas TEXT,
    subtotal REAL DEFAULT 0,
    itbis REAL DEFAULT 0,
    total REAL DEFAULT 0,
    estado TEXT DEFAULT 'borrador',
    client_nombre TEXT,
    client_rnc TEXT,
    client_direccion TEXT,
    client_telefono TEXT,
    client_email TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad REAL NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    orden INTEGER DEFAULT 0,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS emisor_settings (
    user_id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL DEFAULT '',
    rnc TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const emisorCols = db.prepare('PRAGMA table_info(emisor_settings)').all();
if (!emisorCols.some((c) => c.name === 'logo')) {
  db.exec('ALTER TABLE emisor_settings ADD COLUMN logo TEXT');
}
if (!emisorCols.some((c) => c.name === 'smtp_user')) {
  db.exec('ALTER TABLE emisor_settings ADD COLUMN smtp_user TEXT');
}
if (!emisorCols.some((c) => c.name === 'smtp_password_enc')) {
  db.exec('ALTER TABLE emisor_settings ADD COLUMN smtp_password_enc TEXT');
}
if (!emisorCols.some((c) => c.name === 'smtp_password')) {
  db.exec('ALTER TABLE emisor_settings ADD COLUMN smtp_password TEXT');
}
if (!emisorCols.some((c) => c.name === 'firma')) {
  db.exec('ALTER TABLE emisor_settings ADD COLUMN firma TEXT');
}
if (!emisorCols.some((c) => c.name === 'sello')) {
  db.exec('ALTER TABLE emisor_settings ADD COLUMN sello TEXT');
}
if (!emisorCols.some((c) => c.name === 'mensaje_pdf')) {
  db.exec('ALTER TABLE emisor_settings ADD COLUMN mensaje_pdf TEXT');
}

const { decrypt } = require('./utils/credentials');
const emisorSmtpMigrate = db
  .prepare(
    `SELECT user_id, smtp_password_enc, smtp_password FROM emisor_settings
     WHERE smtp_password_enc IS NOT NULL AND (smtp_password IS NULL OR smtp_password = '')`
  )
  .all();
for (const row of emisorSmtpMigrate) {
  const plain = decrypt(row.smtp_password_enc);
  if (plain) {
    db.prepare('UPDATE emisor_settings SET smtp_password = ? WHERE user_id = ?').run(plain, row.user_id);
  }
}

const quoteCols = db.prepare('PRAGMA table_info(quotes)').all();
if (!quoteCols.some((c) => c.name === 'itbis_rate')) {
  db.exec('ALTER TABLE quotes ADD COLUMN itbis_rate REAL DEFAULT 18');
}
if (!quoteCols.some((c) => c.name === 'itbis_manual')) {
  db.exec('ALTER TABLE quotes ADD COLUMN itbis_manual INTEGER DEFAULT 0');
}
if (!quoteCols.some((c) => c.name === 'monto_pagado')) {
  db.exec('ALTER TABLE quotes ADD COLUMN monto_pagado REAL DEFAULT 0');
}
if (!quoteCols.some((c) => c.name === 'pdf_token')) {
  db.exec('ALTER TABLE quotes ADD COLUMN pdf_token TEXT');
}
if (!quoteCols.some((c) => c.name === 'ejecutivo')) {
  db.exec('ALTER TABLE quotes ADD COLUMN ejecutivo TEXT');
}
if (!quoteCols.some((c) => c.name === 'forma_pago')) {
  db.exec("ALTER TABLE quotes ADD COLUMN forma_pago TEXT DEFAULT 'Efectivo / Transferencia'");
}
if (!quoteCols.some((c) => c.name === 'descuento')) {
  db.exec('ALTER TABLE quotes ADD COLUMN descuento REAL NOT NULL DEFAULT 0');
}
db.exec(`
  CREATE TABLE IF NOT EXISTS quote_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    definition_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_quote_templates_user ON quote_templates(user_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS quote_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha TEXT NOT NULL,
    metodo TEXT,
    referencia TEXT,
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
  );
`);

const { migrateInvoicingSchema } = require('./invoices/migrateSchema');
migrateInvoicingSchema(db);

const { migrateDgiiSchema } = require('./dgii/migrateDgiiSchema');
migrateDgiiSchema(db);

const { migrateExpensesSchema } = require('./expenses/migrateExpensesSchema');
migrateExpensesSchema(db);

const { migrateLegacyEstados } = require('./quoteWorkflow');
migrateLegacyEstados(db);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_license (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    product_key TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    modules_json TEXT NOT NULL DEFAULT '[]',
    customer_name TEXT,
    expires_at TEXT,
    last_license_sync TEXT,
    activated_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

const licenseCols = db.prepare('PRAGMA table_info(app_license)').all();
if (!licenseCols.some((c) => c.name === 'last_license_sync')) {
  db.exec('ALTER TABLE app_license ADD COLUMN last_license_sync TEXT');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS license_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    product_key TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    modules_json TEXT NOT NULL DEFAULT '[]',
    result TEXT NOT NULL,
    message TEXT,
    source TEXT
  );
`);
if (licenseCols.some((c) => c.name === 'license_token')) {
  db.exec(`
    CREATE TABLE app_license_migrated (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      product_key TEXT NOT NULL,
      machine_id TEXT NOT NULL,
      modules_json TEXT NOT NULL DEFAULT '[]',
      customer_name TEXT,
      expires_at TEXT,
      activated_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO app_license_migrated (
      id, product_key, machine_id, modules_json, customer_name, expires_at, activated_at, updated_at
    )
    SELECT
      id, product_key, machine_id, modules_json, customer_name, expires_at, activated_at, updated_at
    FROM app_license;
    DROP TABLE app_license;
    ALTER TABLE app_license_migrated RENAME TO app_license;
  `);
}

// Recalcular monto_pagado desde historial
const paySum = db.prepare(`
  UPDATE quotes SET monto_pagado = COALESCE(
    (SELECT SUM(monto) FROM quote_payments WHERE quote_payments.quote_id = quotes.id), 0
  )
`);
paySum.run();

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    'INSERT INTO users (nombre, email, password_hash) VALUES (?, ?, ?)'
  ).run('Administrador', 'admin@demo.local', hash);
  db.prepare('INSERT INTO emisor_settings (user_id, nombre, rnc) VALUES (?, ?, ?)').run(
    1,
    'Empresa Demo',
    '000000000'
  );
}

function closeDb() {
  try {
    db.close();
  } catch {
    /* ya cerrada */
  }
}

module.exports = db;
module.exports.close = closeDb;
