const db = require('../db');
const repo = require('./expenseRepository');
const { ensureDefaultCategories } = require('./migrateExpensesSchema');
const { computeDocumentProfitability } = require('./profitCalculation');
const { buildExpensesCsv, buildExpensesPdfHtml } = require('./exportExpenses');
const {
  validateExpensePayload: validateExpensePayloadCore,
  ExpenseValidationError,
} = require('./validateExpense');

const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Otro',
];

class ExpenseError extends Error {
  constructor(message, code = 'EXPENSE_ERROR') {
    super(message);
    this.code = code;
  }
}

function validateExpensePayload(body, opts) {
  try {
    validateExpensePayloadCore(body, opts);
  } catch (err) {
    if (err instanceof ExpenseValidationError) {
      throw new ExpenseError(err.message);
    }
    throw err;
  }
}

function ensureCategories(userId) {
  ensureDefaultCategories(db, userId);
  return repo.listCategories(userId);
}

function getQuoteItems(quoteId) {
  return db
    .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY orden, id')
    .all(quoteId);
}

function getInvoiceItems(invoiceId) {
  return db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY orden, id')
    .all(invoiceId);
}

function getQuoteProfitability(quoteId, userId) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(quoteId, userId);
  if (!quote) return null;
  const items = getQuoteItems(quoteId);
  const expenses = repo.expensesByQuote(quoteId, userId);
  return {
    quote: { id: quote.id, numero: quote.numero },
    expenses,
    profitability: computeDocumentProfitability(quote, items, expenses),
  };
}

function getInvoiceProfitability(invoiceId, userId) {
  const invoice = db
    .prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
    .get(invoiceId, userId);
  if (!invoice) return null;
  const items = getInvoiceItems(invoiceId);
  const expenses = repo.expensesByInvoice(invoiceId, userId);
  return {
    invoice: { id: invoice.id, fiscal_number: invoice.fiscal_number },
    expenses,
    profitability: computeDocumentProfitability(invoice, items, expenses),
  };
}

function reportSummary(userId, filters) {
  const rows = repo.listExpenses(userId, filters);
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const count = rows.length;
  const average = count ? total / count : 0;

  const byCategory = {};
  for (const r of rows) {
    const key = r.category_name || 'Sin categoría';
    if (!byCategory[key]) byCategory[key] = { name: key, total: 0, count: 0 };
    byCategory[key].total += Number(r.amount);
    byCategory[key].count += 1;
  }
  const topCategories = Object.values(byCategory)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return { total, count, average, rows, topCategories };
}

function incomeStatement(userId, from, to) {
  const invoices = db
    .prepare(
      `SELECT i.* FROM invoices i
       WHERE i.user_id = ? AND i.estado != 'anulada'
         AND i.fecha_emision >= ? AND i.fecha_emision <= ?`
    )
    .all(userId, from, to);

  let revenue = 0;
  let productCost = 0;
  for (const inv of invoices) {
    revenue += Number(inv.subtotal) - Number(inv.descuento || 0);
    const items = getInvoiceItems(inv.id);
    productCost += items.reduce(
      (s, i) => s + Number(i.cantidad) * Number(i.costo_unitario || 0),
      0
    );
  }

  const expenseRows = repo.listExpenses(userId, { from, to });
  const expenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0);
  const operatingProfit = revenue - productCost - expenses;

  const monthly = {};
  for (const inv of invoices) {
    const m = inv.fecha_emision.slice(0, 7);
    if (!monthly[m]) monthly[m] = { month: m, revenue: 0, expenses: 0 };
    monthly[m].revenue += Number(inv.total);
  }
  for (const e of expenseRows) {
    const m = e.expense_date.slice(0, 7);
    if (!monthly[m]) monthly[m] = { month: m, revenue: 0, expenses: 0 };
    monthly[m].expenses += Number(e.amount);
  }
  const monthlyComparison = Object.values(monthly).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return {
    period: { from, to },
    revenue,
    productCost,
    expenses,
    operatingProfit,
    invoiceCount: invoices.length,
    expenseCount: expenseRows.length,
    monthlyComparison,
  };
}

function dashboardStats(userId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const monthStart = `${y}-${m}-01`;
  const yearStart = `${y}-01-01`;
  const today = now.toISOString().slice(0, 10);

  const monthExpenses = repo.listExpenses(userId, { from: monthStart, to: today });
  const yearExpenses = repo.listExpenses(userId, { from: yearStart, to: today });

  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const yearTotal = yearExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCat = {};
  for (const e of monthExpenses) {
    const k = e.category_name;
    byCat[k] = (byCat[k] || 0) + Number(e.amount);
  }
  const topCategories = Object.entries(byCat)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const stmt = incomeStatement(userId, monthStart, today);

  const monthInvoices = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS t FROM invoices
       WHERE user_id = ? AND estado != 'anulada' AND fecha_emision >= ? AND fecha_emision <= ?`
    )
    .get(userId, monthStart, today);

  return {
    expensesMonth: monthTotal,
    expensesYear: yearTotal,
    topCategories,
    netProfitMonth: stmt.operatingProfit,
    revenueMonth: monthInvoices.t,
    expensesVsRevenue: {
      revenue: Number(monthInvoices.t),
      expenses: monthTotal,
    },
  };
}

function exportReport(userId, filters, format) {
  const summary = reportSummary(userId, filters);
  if (format === 'csv') {
    return { contentType: 'text/csv; charset=utf-8', body: buildExpensesCsv(summary.rows) };
  }
  if (format === 'pdf') {
    return {
      contentType: 'text/html; charset=utf-8',
      body: buildExpensesPdfHtml(summary),
    };
  }
  return { contentType: 'text/csv; charset=utf-8', body: buildExpensesCsv(summary.rows) };
}

module.exports = {
  ExpenseError,
  PAYMENT_METHODS,
  validateExpensePayload,
  ensureCategories,
  repo,
  getQuoteProfitability,
  getInvoiceProfitability,
  reportSummary,
  incomeStatement,
  dashboardStats,
  exportReport,
};
