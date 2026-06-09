const { renderChartSvg } = require('./ChartEngine');

function formatGeneratedAt(date = new Date()) {
  return date.toLocaleString('es-DO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function buildReportHtml({
  title = 'Reporte',
  generatedAt = new Date(),
  filters = [],
  rows = [],
  summary = {},
  chartSvg = '',
  query = '',
}) {
  const keys = rows?.length
    ? [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith('_'))
    : [];

  const filterHtml = filters.length
    ? `<ul>${filters.map((f) => `<li>${f}</li>`).join('')}</ul>`
    : '<p><em>Sin filtros aplicados</em></p>';

  const summaryRows = Object.entries(summary)
    .filter(([k]) => !['count', 'groups'].includes(k))
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('');

  const bodyRows = (rows || [])
    .map((r) => `<tr>${keys.map((k) => `<td>${r[k] ?? ''}</td>`).join('')}</tr>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 28px; color: #111; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
  h2 { font-size: 15px; margin: 20px 0 8px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
  th { background: #f4f4f4; }
  .chart { margin: 16px 0; text-align: center; }
  ul { margin: 0; padding-left: 18px; font-size: 13px; }
</style></head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generado: ${formatGeneratedAt(generatedAt)}</p>
  ${query ? `<p class="meta">Consulta: ${query}</p>` : ''}
  <h2>Filtros aplicados</h2>
  ${filterHtml}
  ${summaryRows ? `<h2>Resumen</h2><table>${summaryRows}</table>` : ''}
  ${chartSvg ? `<div class="chart">${chartSvg}</div>` : ''}
  <h2>Resultados</h2>
  <table>
    <thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead>
    <tbody>${bodyRows || '<tr><td colspan="99">Sin datos</td></tr>'}</tbody>
  </table>
</body></html>`;
}

async function exportPdf(payload) {
  const html = buildReportHtml(payload);
  try {
    const { generatePdfFromHtmlPuppeteer } = require('../pdf/html-to-pdf');
    const buffer = await generatePdfFromHtmlPuppeteer(html);
    return {
      contentType: 'application/pdf',
      extension: 'pdf',
      data: buffer,
      binary: true,
    };
  } catch (err) {
    return {
      contentType: 'text/html; charset=utf-8',
      extension: 'html',
      data: html,
      binary: false,
      note: err.message,
      fallback: true,
    };
  }
}

module.exports = { buildReportHtml, exportPdf, formatGeneratedAt };
