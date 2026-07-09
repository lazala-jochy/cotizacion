const db = require('../db');
const { incomeStatement } = require('../expenses/expenseService');

function monthRange(year, month) {
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function prevMonth(year, month) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

function withGrowth(current, previous) {
  return { value: current, previous, changePct: pctChange(current, previous) };
}

function sumInvoices(userId, from, to, extraWhere = '') {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
       FROM invoices
       WHERE user_id = ? AND estado != 'anulada'
         AND fecha_emision >= ? AND fecha_emision <= ? ${extraWhere}`
    )
    .get(userId, from, to);
  return { total: Number(row.total), count: Number(row.count) };
}

function pendingInvoices(userId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total - COALESCE(monto_pagado, 0)), 0) AS balance
       FROM invoices
       WHERE user_id = ? AND estado IN ('pendiente', 'parcial', 'vencida')`
    )
    .get(userId);
  return { count: Number(row.count), balance: Number(row.balance) };
}

function activeClients(userId, from, to) {
  const hasInvoiceClientId = db
    .prepare('PRAGMA table_info(invoices)')
    .all()
    .some((c) => c.name === 'client_id');

  const invoiceClientSql = hasInvoiceClientId
    ? `SELECT client_id FROM invoices WHERE user_id = ? AND client_id IS NOT NULL AND fecha_emision >= ? AND fecha_emision <= ?`
    : `SELECT NULL AS client_id WHERE 0`;

  const byId = db
    .prepare(
      `SELECT COUNT(DISTINCT client_id) AS c FROM (
         SELECT client_id FROM quotes WHERE user_id = ? AND client_id IS NOT NULL AND fecha >= ? AND fecha <= ?
         UNION
         ${invoiceClientSql}
       )`
    )
    .get(userId, from, to, ...(hasInvoiceClientId ? [userId, from, to] : []));

  const byName = db
    .prepare(
      `SELECT COUNT(DISTINCT client_nombre) AS c FROM (
         SELECT client_nombre FROM quotes WHERE user_id = ? AND fecha >= ? AND fecha <= ? AND client_nombre IS NOT NULL AND TRIM(client_nombre) != ''
         UNION
         SELECT client_nombre FROM invoices WHERE user_id = ? AND fecha_emision >= ? AND fecha_emision <= ? AND client_nombre IS NOT NULL AND TRIM(client_nombre) != ''
       )`
    )
    .get(userId, from, to, userId, from, to);

  return Math.max(Number(byId.c), Number(byName.c));
}

function approvedQuotes(userId, from, to) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM quotes
       WHERE user_id = ? AND fecha >= ? AND fecha <= ?
         AND estado IN ('aprobada', 'en_proceso', 'completada', 'pago_parcial', 'pagada', 'aceptada')`
    )
    .get(userId, from, to);
  return Number(row.c);
}

function quoteConversionRate(userId, from, to) {
  const total = db
    .prepare(
      `SELECT COUNT(*) AS c FROM quotes
       WHERE user_id = ? AND fecha >= ? AND fecha <= ? AND estado != 'cancelada'`
    )
    .get(userId, from, to);
  const converted = db
    .prepare(
      `SELECT COUNT(DISTINCT q.id) AS c FROM quotes q
       INNER JOIN invoices i ON i.quote_id = q.id AND i.user_id = q.user_id AND i.estado != 'anulada'
       WHERE q.user_id = ? AND q.fecha >= ? AND q.fecha <= ?`
    )
    .get(userId, from, to);
  const t = Number(total.c);
  const c = Number(converted.c);
  return t === 0 ? 0 : Math.round((c / t) * 1000) / 10;
}

function projectedCashFlow(userId) {
  const receivables = db
    .prepare(
      `SELECT COALESCE(SUM(total - COALESCE(monto_pagado, 0)), 0) AS v
       FROM invoices WHERE user_id = ? AND estado IN ('pendiente', 'parcial', 'vencida')`
    )
    .get(userId);
  const approvedNotInvoiced = db
    .prepare(
      `SELECT COALESCE(SUM(q.total), 0) AS v FROM quotes q
       LEFT JOIN invoices i ON i.quote_id = q.id AND i.estado != 'anulada'
       WHERE q.user_id = ? AND q.estado IN ('aprobada', 'en_proceso') AND i.id IS NULL`
    )
    .get(userId);
  const pendingExpenses = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses
       WHERE user_id = ? AND expense_date >= date('now', '-30 days')`
    )
    .get(userId);
  const inflow = Number(receivables.v) + Number(approvedNotInvoiced.v);
  const outflow = Number(pendingExpenses.v);
  return { projected: inflow - outflow, inflow, outflow };
}

function getExecutiveKpis(userId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const cur = monthRange(year, month);
  const prev = prevMonth(year, month);
  const prv = monthRange(prev.year, prev.month);

  const salesCur = sumInvoices(userId, cur.start, cur.end);
  const salesPrv = sumInvoices(userId, prv.start, prv.end);

  const pending = pendingInvoices(userId);
  const pendingPrvRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM invoices
       WHERE user_id = ? AND estado IN ('pendiente', 'parcial', 'vencida')
         AND fecha_emision >= ? AND fecha_emision <= ?`
    )
    .get(userId, prv.start, prv.end);

  const clientsCur = activeClients(userId, cur.start, cur.end);
  const clientsPrv = activeClients(userId, prv.start, prv.end);

  const approvedCur = approvedQuotes(userId, cur.start, cur.end);
  const approvedPrv = approvedQuotes(userId, prv.start, prv.end);

  const convCur = quoteConversionRate(userId, cur.start, cur.end);
  const convPrv = quoteConversionRate(userId, prv.start, prv.end);

  const cash = projectedCashFlow(userId);

  return {
    salesMonth: withGrowth(salesCur.total, salesPrv.total),
    pendingInvoices: withGrowth(pending.count, Number(pendingPrvRow.c)),
    pendingInvoicesBalance: pending.balance,
    activeClients: withGrowth(clientsCur, clientsPrv),
    approvedQuotes: withGrowth(approvedCur, approvedPrv),
    conversionRate: withGrowth(convCur, convPrv),
    cashFlowProjected: { value: cash.projected, inflow: cash.inflow, outflow: cash.outflow },
    period: { year, month, from: cur.start, to: cur.end },
  };
}

function last12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

function monthLabel(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('es-DO', { month: 'short', year: '2-digit' });
}

function getAnalytics(userId) {
  const months = last12Months();
  const salesByMonth = [];
  const profitByMonth = [];

  for (const { year, month } of months) {
    const { start, end } = monthRange(year, month);
    const sales = sumInvoices(userId, start, end);
    const stmt = incomeStatement(userId, start, end);
    salesByMonth.push({
      label: monthLabel(year, month),
      year,
      month,
      revenue: sales.total,
      invoiceCount: sales.count,
    });
    profitByMonth.push({
      label: monthLabel(year, month),
      year,
      month,
      profit: stmt.operatingProfit,
      revenue: stmt.revenue,
      expenses: stmt.expenses,
    });
  }

  const now = new Date();
  const cur = monthRange(now.getFullYear(), now.getMonth() + 1);
  const monthExpenses = db
    .prepare(
      `SELECT ec.name AS category, COALESCE(SUM(e.amount), 0) AS total
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date <= ?
       GROUP BY ec.name
       ORDER BY total DESC`
    )
    .all(userId, cur.start, cur.end);

  const invoiceStatus = db
    .prepare(
      `SELECT
         SUM(CASE WHEN estado IN ('pagada') THEN total ELSE 0 END) AS collected,
         SUM(CASE WHEN estado IN ('pendiente', 'parcial', 'vencida') THEN total - COALESCE(monto_pagado, 0) ELSE 0 END) AS pending,
         COUNT(CASE WHEN estado = 'pagada' THEN 1 END) AS collectedCount,
         COUNT(CASE WHEN estado IN ('pendiente', 'parcial', 'vencida') THEN 1 END) AS pendingCount
       FROM invoices WHERE user_id = ? AND estado != 'anulada'`
    )
    .get(userId);

  return {
    salesByMonth,
    profitByMonth,
    expensesByCategory: monthExpenses.map((r) => ({
      name: r.category || 'Sin categoría',
      total: Number(r.total),
    })),
    invoicesCollection: {
      collected: Number(invoiceStatus.collected),
      pending: Number(invoiceStatus.pending),
      collectedCount: Number(invoiceStatus.collectedCount),
      pendingCount: Number(invoiceStatus.pendingCount),
    },
  };
}

module.exports = {
  getExecutiveKpis,
  getAnalytics,
  monthRange,
  pctChange,
};
