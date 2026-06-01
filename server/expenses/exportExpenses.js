function escapeCsv(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildExpensesCsv(rows) {
  const header = [
    'Fecha',
    'Categoría',
    'Descripción',
    'Monto',
    'Método pago',
    'Referencia',
    'Cotización',
    'Factura',
    'Cliente',
    'Proyecto',
  ];
  const lines = [header.map(escapeCsv).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.expense_date,
        r.category_name,
        r.description,
        r.amount,
        r.payment_method,
        r.reference_number,
        r.quote_numero,
        r.invoice_fiscal_number,
        r.client_nombre,
        r.project_name,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }
  return `\uFEFF${lines.join('\n')}`;
}

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n || 0);
}

function buildExpensesPdfHtml(summary) {
  const rows = summary.rows
    .map(
      (r) =>
        `<tr><td>${r.expense_date}</td><td>${r.category_name}</td><td>${r.description}</td><td align="right">${formatMoney(r.amount)}</td></tr>`
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte de gastos</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;font-size:12px}th{background:#f0f0f0}</style></head>
<body><h1>Reporte de gastos</h1>
<p>Total: <strong>${formatMoney(summary.total)}</strong> · Registros: ${summary.count} · Promedio: ${formatMoney(summary.average)}</p>
<table><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody></table></body></html>`;
}

module.exports = { buildExpensesCsv, buildExpensesPdfHtml };
