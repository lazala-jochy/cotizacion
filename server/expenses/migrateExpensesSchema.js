/** Esquema de gastos, categorías y proyectos. */
const DEFAULT_CATEGORIES = [
  'Transporte',
  'Combustible',
  'Electricidad',
  'Agua',
  'Internet',
  'Teléfono',
  'Nómina',
  'Publicidad',
  'Marketing',
  'Alquiler',
  'Materiales',
  'Equipos',
  'Herramientas',
  'Mantenimiento',
  'Viáticos',
  'Impuestos',
  'Comisiones',
  'Otros',
];

function migrateExpensesSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      client_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'activo',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      quote_id INTEGER,
      invoice_id INTEGER,
      client_id INTEGER,
      project_id INTEGER,
      expense_date TEXT NOT NULL,
      description TEXT NOT NULL,
      reference_number TEXT,
      amount REAL NOT NULL,
      payment_method TEXT,
      notes TEXT,
      attachment_name TEXT,
      attachment_mime TEXT,
      attachment_data TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id),
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_quote ON expenses(quote_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_invoice ON expenses(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
  `);

  const quoteCols = db.prepare('PRAGMA table_info(quote_items)').all();
  if (!quoteCols.some((c) => c.name === 'costo_unitario')) {
    db.exec('ALTER TABLE quote_items ADD COLUMN costo_unitario REAL NOT NULL DEFAULT 0');
  }

  const invoiceItemCols = db.prepare('PRAGMA table_info(invoice_items)').all();
  if (invoiceItemCols.length && !invoiceItemCols.some((c) => c.name === 'costo_unitario')) {
    db.exec('ALTER TABLE invoice_items ADD COLUMN costo_unitario REAL NOT NULL DEFAULT 0');
  }

  const expenseCols = db.prepare('PRAGMA table_info(expenses)').all();
  if (expenseCols.length) {
    if (!expenseCols.some((c) => c.name === 'rnc')) {
      db.exec('ALTER TABLE expenses ADD COLUMN rnc TEXT');
    }
    if (!expenseCols.some((c) => c.name === 'ncf')) {
      db.exec('ALTER TABLE expenses ADD COLUMN ncf TEXT');
    }
    if (!expenseCols.some((c) => c.name === 'itbis')) {
      db.exec('ALTER TABLE expenses ADD COLUMN itbis REAL');
    }
  }

  const users = db.prepare('SELECT id FROM users').all();
  const insertCat = db.prepare(
    `INSERT OR IGNORE INTO expense_categories (user_id, name, updated_at) VALUES (?, ?, datetime('now'))`
  );
  for (const u of users) {
    for (const name of DEFAULT_CATEGORIES) {
      insertCat.run(u.id, name);
    }
  }
}

function ensureDefaultCategories(db, userId) {
  const insertCat = db.prepare(
    `INSERT OR IGNORE INTO expense_categories (user_id, name, updated_at) VALUES (?, ?, datetime('now'))`
  );
  for (const name of DEFAULT_CATEGORIES) {
    insertCat.run(userId, name);
  }
}

module.exports = { migrateExpensesSchema, ensureDefaultCategories, DEFAULT_CATEGORIES };
