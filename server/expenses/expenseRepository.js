const db = require('../db');

function listCategories(userId) {
  return db
    .prepare(
      'SELECT * FROM expense_categories WHERE user_id = ? ORDER BY name COLLATE NOCASE'
    )
    .all(userId);
}

function getCategory(id, userId) {
  return db
    .prepare('SELECT * FROM expense_categories WHERE id = ? AND user_id = ?')
    .get(id, userId);
}

function createCategory(userId, data) {
  const result = db
    .prepare(
      `INSERT INTO expense_categories (user_id, name, description, updated_at)
       VALUES (?, ?, ?, datetime('now'))`
    )
    .run(userId, data.name.trim(), data.description?.trim() || null);
  return getCategory(result.lastInsertRowid, userId);
}

function updateCategory(id, userId, data) {
  db.prepare(
    `UPDATE expense_categories SET name = ?, description = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(data.name.trim(), data.description?.trim() || null, id, userId);
  return getCategory(id, userId);
}

function deleteCategory(id, userId) {
  const used = db
    .prepare('SELECT COUNT(*) AS c FROM expenses WHERE category_id = ? AND user_id = ?')
    .get(id, userId);
  if (used.c > 0) return { ok: false, error: 'La categoría tiene gastos asociados.' };
  const r = db
    .prepare('DELETE FROM expense_categories WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return { ok: r.changes > 0 };
}

function listProjects(userId) {
  return db
    .prepare(
      `SELECT p.*, c.nombre AS client_nombre
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.user_id = ?
       ORDER BY p.name COLLATE NOCASE`
    )
    .all(userId);
}

function createProject(userId, data) {
  const result = db
    .prepare(
      `INSERT INTO projects (user_id, client_id, name, description, status, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      userId,
      data.client_id || null,
      data.name.trim(),
      data.description?.trim() || null,
      data.status || 'activo'
    );
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
}

function buildExpenseFilters(userId, filters) {
  let sql = `
    SELECT e.id, e.user_id, e.category_id, e.quote_id, e.invoice_id, e.client_id, e.project_id,
      e.expense_date, e.description, e.reference_number, e.amount, e.itbis, e.payment_method, e.notes,
      e.attachment_name, e.attachment_mime,
      CASE WHEN e.attachment_data IS NOT NULL AND length(e.attachment_data) > 0 THEN 1 ELSE 0 END AS has_attachment,
      e.created_by, e.created_at, e.updated_at,
      c.name AS category_name,
      e.rnc, e.ncf,
      q.numero AS quote_numero, i.fiscal_number AS invoice_fiscal_number,
      cl.nombre AS client_nombre, p.name AS project_name
    FROM expenses e
    JOIN expense_categories c ON c.id = e.category_id
    LEFT JOIN quotes q ON q.id = e.quote_id
    LEFT JOIN invoices i ON i.id = e.invoice_id
    LEFT JOIN clients cl ON cl.id = e.client_id
    LEFT JOIN projects p ON p.id = e.project_id
    WHERE e.user_id = ?`;
  const params = [userId];

  if (filters.from) {
    sql += ' AND e.expense_date >= ?';
    params.push(filters.from);
  }
  if (filters.to) {
    sql += ' AND e.expense_date <= ?';
    params.push(filters.to);
  }
  if (filters.category_id) {
    sql += ' AND e.category_id = ?';
    params.push(filters.category_id);
  }
  if (filters.client_id) {
    sql += ' AND e.client_id = ?';
    params.push(filters.client_id);
  }
  if (filters.project_id) {
    sql += ' AND e.project_id = ?';
    params.push(filters.project_id);
  }
  if (filters.quote_id) {
    sql += ' AND e.quote_id = ?';
    params.push(filters.quote_id);
  }
  if (filters.invoice_id) {
    sql += ' AND e.invoice_id = ?';
    params.push(filters.invoice_id);
  }

  sql += ' ORDER BY e.expense_date DESC, e.id DESC';
  return { sql, params };
}

function listExpenses(userId, filters = {}) {
  const { sql, params } = buildExpenseFilters(userId, filters);
  return db.prepare(sql).all(...params);
}

function getExpense(id, userId) {
  return db
    .prepare(
      `SELECT e.*, c.name AS category_name
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       WHERE e.id = ? AND e.user_id = ?`
    )
    .get(id, userId);
}

function insertExpense(userId, data, createdBy) {
  const result = db
    .prepare(
      `INSERT INTO expenses (
        user_id, category_id, quote_id, invoice_id, client_id, project_id,
        rnc, ncf, expense_date, description, reference_number, amount, itbis, payment_method, notes,
        attachment_name, attachment_mime, attachment_data, created_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      userId,
      data.category_id,
      data.quote_id ?? null,
      data.invoice_id ?? null,
      data.client_id ?? null,
      data.project_id ?? null,
      data.rnc?.trim() || null,
      data.ncf?.trim() || null,
      data.expense_date,
      data.description.trim(),
      data.reference_number?.trim() || null,
      Number(data.amount),
      data.itbis != null && data.itbis !== '' ? Number(data.itbis) : null,
      data.payment_method?.trim() || null,
      data.notes?.trim() || null,
      data.attachment_name || null,
      data.attachment_mime || null,
      data.attachment_data || null,
      createdBy ?? null
    );
  return getExpense(result.lastInsertRowid, userId);
}

function updateExpense(id, userId, data) {
  const prev = db
    .prepare('SELECT attachment_name, attachment_mime, attachment_data FROM expenses WHERE id = ? AND user_id = ?')
    .get(id, userId);

  let attachmentName = prev?.attachment_name ?? null;
  let attachmentMime = prev?.attachment_mime ?? null;
  let attachmentData = prev?.attachment_data ?? null;

  if (data.clear_attachment) {
    attachmentName = null;
    attachmentMime = null;
    attachmentData = null;
  } else if (data.attachment_data) {
    attachmentName = data.attachment_name || null;
    attachmentMime = data.attachment_mime || null;
    attachmentData = data.attachment_data;
  }

  db.prepare(
    `UPDATE expenses SET
      category_id = ?, quote_id = ?, invoice_id = ?, client_id = ?, project_id = ?,
      rnc = ?, ncf = ?,       expense_date = ?, description = ?, reference_number = ?, amount = ?, itbis = ?,
      payment_method = ?, notes = ?,
      attachment_name = ?, attachment_mime = ?, attachment_data = ?,
      updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    data.category_id,
    data.quote_id ?? null,
    data.invoice_id ?? null,
    data.client_id ?? null,
    data.project_id ?? null,
    data.rnc?.trim() || null,
    data.ncf?.trim() || null,
    data.expense_date,
    data.description.trim(),
    data.reference_number?.trim() || null,
    Number(data.amount),
    data.itbis != null && data.itbis !== '' ? Number(data.itbis) : null,
    data.payment_method?.trim() || null,
    data.notes?.trim() || null,
    attachmentName,
    attachmentMime,
    attachmentData,
    id,
    userId
  );
  return getExpense(id, userId);
}

function deleteExpense(id, userId) {
  const r = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, userId);
  return r.changes > 0;
}

function expensesByQuote(quoteId, userId) {
  return listExpenses(userId, { quote_id: quoteId });
}

function expensesByInvoice(invoiceId, userId) {
  return listExpenses(userId, { invoice_id: invoiceId });
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listProjects,
  createProject,
  listExpenses,
  getExpense,
  insertExpense,
  updateExpense,
  deleteExpense,
  expensesByQuote,
  expensesByInvoice,
};
