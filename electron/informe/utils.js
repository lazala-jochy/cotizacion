const XLSX = require('xlsx');

function normHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  if (/,\d{1,2}$/.test(cleaned) && cleaned.includes('.')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (/,\d{1,2}$/.test(cleaned)) {
    return Number(cleaned.replace(',', '.')) || 0;
  }
  return Number(cleaned.replace(/,/g, '')) || 0;
}

function detectHeaderRow(rows) {
  const limit = Math.min(rows.length, 15);
  let best = { index: 0, score: 0 };
  for (let i = 0; i < limit; i += 1) {
    const row = rows[i] || [];
    const texts = row.filter((c) => String(c || '').trim()).length;
    if (texts > best.score) best = { index: i, score: texts };
  }
  return best.index;
}

function sheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

function readWorkbookMeta(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheets = workbook.SheetNames.map((name) => {
    const rows = sheetRows(workbook, name);
    const headerRow = detectHeaderRow(rows);
    const headers = (rows[headerRow] || []).map((c) => String(c || '').trim()).filter(Boolean);
    const dataRows = rows.slice(headerRow + 1).filter((r) => r.some((c) => String(c || '').trim()));
    return {
      name,
      headerRow,
      headers,
      rowCount: dataRows.length,
      previewHeaders: headers.slice(0, 8),
    };
  });
  return { sheets, sheetNames: workbook.SheetNames };
}

function readSheetRecords(filePath, sheetName) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const rows = sheetRows(workbook, sheetName);
  const headerRow = detectHeaderRow(rows);
  const headerCells = (rows[headerRow] || []).map((c) => String(c || '').trim());
  const records = [];

  for (let r = headerRow + 1; r < rows.length; r += 1) {
    const row = rows[r] || [];
    if (!row.some((c) => String(c || '').trim())) continue;
    const record = {};
    headerCells.forEach((h, idx) => {
      if (h) record[h] = row[idx];
    });
    records.push(record);
  }

  return { records, headers: headerCells.filter(Boolean), headerRow };
}

function groupByKeyword(rows, valueCol, keywordCol, items = []) {
  return items.map(({ label, keyword }) => ({
    label,
    keyword,
    total: rows
      .filter((r) =>
        String(r[keywordCol] || '')
          .toUpperCase()
          .includes(String(keyword || '').toUpperCase())
      )
      .reduce((sum, r) => sum + parseAmount(r[valueCol]), 0),
  }));
}

module.exports = {
  normHeader,
  parseAmount,
  detectHeaderRow,
  readWorkbookMeta,
  readSheetRecords,
  groupByKeyword,
};
