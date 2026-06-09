const XLSX = require('xlsx');

function exportCsv(rows) {
  if (!rows?.length) return 'Sin datos\n';
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith('_'));
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escape(row[k])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function exportXlsx(rows, sheetName = 'Reporte') {
  const wb = XLSX.utils.book_new();
  const clean = rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (!k.startsWith('_')) out[k] = v;
    }
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(clean);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { exportCsv, exportXlsx };
