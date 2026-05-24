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

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    'INSERT INTO users (nombre, email, password_hash) VALUES (?, ?, ?)'
  ).run('Administrador', 'admin@demo.local', hash);
  db.prepare('INSERT INTO emisor_settings (user_id, nombre) VALUES (?, ?)').run(1, '');
}

module.exports = db;
