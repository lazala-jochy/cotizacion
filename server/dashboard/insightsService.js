const db = require('../db');
const { monthRange } = require('./dashboardService');

function getBusinessInsights(userId) {
  const insights = [];
  const now = new Date();
  const cur = monthRange(now.getFullYear(), now.getMonth() + 1);
  const prev = monthRange(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    now.getMonth() === 0 ? 12 : now.getMonth()
  );

  const curExpenses = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS t FROM expenses
       WHERE user_id = ? AND expense_date >= ? AND expense_date <= ?`
    )
    .get(userId, cur.start, cur.end);
  const prevExpenses = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS t FROM expenses
       WHERE user_id = ? AND expense_date >= ? AND expense_date <= ?`
    )
    .get(userId, prev.start, prev.end);

  const curExp = Number(curExpenses.t);
  const prevExp = Number(prevExpenses.t);
  if (prevExp > 0 && curExp > prevExp * 1.25) {
    const pct = Math.round(((curExp - prevExp) / prevExp) * 100);
    insights.push({
      id: 'expenses-high',
      type: 'warning',
      title: 'Gastos elevados',
      description: `Los gastos del mes subieron ${pct}% respecto al mes anterior. Revise categorías con mayor incremento.`,
      action: { label: 'Ver compras', path: '/compras/gastos' },
    });
  }

  const topClients = db
    .prepare(
      `SELECT client_nombre AS name, COALESCE(SUM(total), 0) AS total, COUNT(*) AS orders
       FROM invoices
       WHERE user_id = ? AND estado != 'anulada' AND fecha_emision >= date('now', '-365 days')
         AND client_nombre IS NOT NULL AND TRIM(client_nombre) != ''
       GROUP BY client_nombre
       ORDER BY total DESC
       LIMIT 3`
    )
    .all(userId);

  if (topClients.length > 0) {
    const top = topClients[0];
    insights.push({
      id: 'top-client',
      type: 'success',
      title: 'Cliente más rentable',
      description: `${top.name} generó ${formatMoney(top.total)} en los últimos 12 meses (${top.orders} facturas).`,
      action: { label: 'Ver clientes', path: '/clientes' },
      data: topClients,
    });
  }

  const topProducts = db
    .prepare(
      `SELECT ii.descripcion AS name, COALESCE(SUM(ii.cantidad), 0) AS qty, COALESCE(SUM(ii.total), 0) AS revenue
       FROM invoice_items ii
       INNER JOIN invoices i ON i.id = ii.invoice_id AND i.user_id = ? AND i.estado != 'anulada'
       WHERE i.fecha_emision >= date('now', '-180 days')
       GROUP BY ii.descripcion
       ORDER BY qty DESC
       LIMIT 3`
    )
    .all(userId);

  if (topProducts.length > 0) {
    insights.push({
      id: 'top-products',
      type: 'info',
      title: 'Productos más vendidos',
      description: `"${topProducts[0].name}" lidera ventas con ${topProducts[0].qty} unidades.`,
      action: { label: 'Ver reportes', path: '/reportes' },
      data: topProducts,
    });
  }

  const avgMonthly = db
    .prepare(
      `SELECT COALESCE(AVG(monthly_total), 0) AS avg FROM (
         SELECT strftime('%Y-%m', fecha_emision) AS ym, SUM(total) AS monthly_total
         FROM invoices
         WHERE user_id = ? AND estado != 'anulada' AND fecha_emision >= date('now', '-6 months')
         GROUP BY ym
       )`
    )
    .get(userId);

  const pendingPipeline = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS t FROM quotes
       WHERE user_id = ? AND estado IN ('aprobada', 'en_proceso', 'enviada')`
    )
    .get(userId);

  const projected = Number(avgMonthly.avg) + Number(pendingPipeline.t) * 0.35;
  /*insights.push({
    id: 'revenue-projection',
    type: 'info',
    title: 'Proyección de ingresos',
    description: `Estimación del próximo mes: ${formatMoney(projected)} (promedio histórico + 35% del pipeline activo).`,
    action: { label: 'Ver pipeline', path: '/pipeline' },
    data: { projected, avgMonthly: Number(avgMonthly.avg), pipeline: Number(pendingPipeline.t) },
  });*/

  const overdueCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM invoices
       WHERE user_id = ? AND estado IN ('vencida', 'pendiente', 'parcial')
         AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < date('now')`
    )
    .get(userId);

  if (Number(overdueCount.c) > 0) {
    insights.push({
      id: 'overdue-alert',
      type: 'danger',
      title: 'Cobros pendientes',
      description: `Tiene ${overdueCount.c} factura(s) vencida(s). Active recordatorios de cobro.`,
      action: { label: 'Ver facturas', path: '/facturas' },
    });
  }

  return insights;
}

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

module.exports = { getBusinessInsights };
