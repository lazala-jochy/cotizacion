const XLSX = require('xlsx');
const { normHeader, slugKey, parseNumber, isDateLike } = require('./utils');

const SEMANTIC_RULES = [
  { semantic: 'date', patterns: [/fecha/, /date/, /periodo/] },
  { semantic: 'entity', patterns: [/proveedor/, /entidad/, /suplidor/, /tienda/, /origen/, /vendor/, /sucursal/] },
  { semantic: 'product', patterns: [/producto/, /articulo/, /artículo/, /item/, /descripcion/, /descripción/] },
  { semantic: 'category', patterns: [/categoria/, /categoría/, /rubro/, /clase/] },
  { semantic: 'branch', patterns: [/sucursal/, /local/, /tienda/, /branch/] },
  { semantic: 'quantity', patterns: [/cantidad/, /qty/, /unidades/] },
  { semantic: 'unit_price', patterns: [/precio unit/, /unitario/, /p\.?\s*unit/] },
  { semantic: 'purchase', patterns: [/compra/, /gasto/, /costo/, /entrada/, /egreso/] },
  { semantic: 'sale', patterns: [/venta/, /vendido/, /salida/, /ingreso/] },
  { semantic: 'movement_type', patterns: [/^tipo$/, /movimiento/, /operacion/, /operación/] },
  { semantic: 'amount', patterns: [/total/, /monto/, /valor/, /importe/, /amount/] },
];

function inferColumnType(values) {
  const sample = values.filter((v) => v != null && String(v).trim() !== '').slice(0, 40);
  if (!sample.length) return 'text';

  let num = 0;
  let date = 0;
  let currency = 0;
  let pct = 0;

  for (const v of sample) {
    const s = String(v).trim();
    if (/%$/.test(s)) pct += 1;
    if (/^[\$\€\£]/.test(s) || /\bdop\b/i.test(s)) currency += 1;
    if (isDateLike(v)) date += 1;
    if (parseNumber(v) != null) num += 1;
  }

  const ratio = (n) => n / sample.length;
  if (ratio(date) > 0.6) return 'date';
  if (ratio(pct) > 0.5) return 'percentage';
  if (ratio(currency) > 0.4 || (ratio(num) > 0.7 && currency > 0)) return 'currency';
  if (ratio(num) > 0.7) return 'number';
  return 'text';
}

function inferSemantic(label) {
  const h = normHeader(label);
  for (const rule of SEMANTIC_RULES) {
    if (rule.patterns.some((p) => p.test(h))) return rule.semantic;
  }
  return 'generic';
}

function rowsFromSheet(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

function detectHeaderRow(rows) {
  const limit = Math.min(rows.length, 20);
  let best = { index: 0, score: 0 };
  for (let i = 0; i < limit; i += 1) {
    const row = rows[i] || [];
    const texts = row.filter((c) => String(c || '').trim()).length;
    if (texts > best.score) best = { index: i, score: texts };
  }
  return best.index;
}

function parseSheet(rows, sheetName) {
  if (!rows.length) {
    return { name: sheetName, columns: [], records: [], rowCount: 0 };
  }

  const headerRow = detectHeaderRow(rows);
  const headerCells = (rows[headerRow] || []).map((c) => String(c || '').trim());
  const used = new Set();
  const columns = headerCells
    .map((label, idx) => {
      if (!label) return null;
      const key = slugKey(label, used);
      const colValues = [];
      for (let r = headerRow + 1; r < rows.length; r += 1) {
        colValues.push(rows[r]?.[idx]);
      }
      const type = inferColumnType(colValues);
      return {
        key,
        label,
        index: idx,
        type,
        semantic: inferSemantic(label),
        sampleValues: colValues.filter((v) => String(v || '').trim()).slice(0, 3),
      };
    })
    .filter(Boolean);

  const records = [];
  for (let r = headerRow + 1; r < rows.length; r += 1) {
    const row = rows[r] || [];
    if (!row.some((c) => String(c || '').trim())) continue;
    const record = { _sheet: sheetName, _row: r + 1 };
    let hasValue = false;
    for (const col of columns) {
      const raw = row[col.index];
      let value = raw;
      if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
        value = parseNumber(raw);
      } else if (col.type === 'date') {
        value = raw;
      } else {
        value = String(raw || '').trim();
      }
      if (value !== '' && value != null) hasValue = true;
      record[col.key] = value;
    }
    if (hasValue) records.push(record);
  }

  return { name: sheetName, columns, records, rowCount: records.length };
}

function analyzeWorkbook(buffer, fileName = 'dataset.xlsx') {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = [];
  const allRecords = [];

  for (const name of workbook.SheetNames) {
    const parsed = parseSheet(rowsFromSheet(workbook.Sheets[name]), name);
    sheets.push({
      name: parsed.name,
      rowCount: parsed.rowCount,
      columns: parsed.columns,
    });
    allRecords.push(...parsed.records);
  }

  const mergedColumns = sheets[0]?.columns || [];
  return {
    schema: {
      fileName,
      sheets,
      activeSheet: sheets[0]?.name || null,
      columns: mergedColumns,
      recordCount: allRecords.length,
    },
    records: allRecords,
  };
}

module.exports = {
  analyzeWorkbook,
  inferColumnType,
  inferSemantic,
  parseSheet,
};
