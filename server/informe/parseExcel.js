const XLSX = require('xlsx');
const {
  ENTITIES,
  STAR_PRODUCTS,
  CHICKEN_SOURCES,
  ENTITY_HEADERS,
  PRODUCT_HEADERS,
  PURCHASE_HEADERS,
  SALE_HEADERS,
  AMOUNT_HEADERS,
  TYPE_HEADERS,
} = require('./constants');

function normHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseNumber(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/,(?=\d{3}\b)/g, '');
  const normalized = cleaned.includes(',') && !cleaned.includes('.')
    ? cleaned.replace(',', '.')
    : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function matchHeader(cell, candidates) {
  const n = normHeader(cell);
  return candidates.find((c) => n === c || n.includes(c));
}

function detectColumns(rows) {
  const scanLimit = Math.min(rows.length, 15);
  for (let r = 0; r < scanLimit; r += 1) {
    const row = rows[r] || [];
    const headers = row.map((c) => normHeader(c));
    if (!headers.some(Boolean)) continue;

    const entityIdx = headers.findIndex((h) => ENTITY_HEADERS.some((k) => h.includes(k)));
    const productIdx = headers.findIndex((h) => PRODUCT_HEADERS.some((k) => h.includes(k)));
    const purchaseIdx = headers.findIndex((h) => PURCHASE_HEADERS.some((k) => h.includes(k)));
    const saleIdx = headers.findIndex((h) => SALE_HEADERS.some((k) => h.includes(k)));
    const amountIdx = headers.findIndex((h) => AMOUNT_HEADERS.some((k) => h.includes(k)));
    const typeIdx = headers.findIndex((h) => TYPE_HEADERS.some((k) => h.includes(k)));

    if (entityIdx >= 0 || productIdx >= 0 || purchaseIdx >= 0 || saleIdx >= 0 || amountIdx >= 0) {
      return {
        headerRow: r,
        entityIdx: entityIdx >= 0 ? entityIdx : -1,
        productIdx: productIdx >= 0 ? productIdx : -1,
        purchaseIdx: purchaseIdx >= 0 ? purchaseIdx : -1,
        saleIdx: saleIdx >= 0 ? saleIdx : -1,
        amountIdx: amountIdx >= 0 ? amountIdx : -1,
        typeIdx: typeIdx >= 0 ? typeIdx : -1,
        headers: row.map((c) => String(c || '').trim()),
      };
    }
  }
  return null;
}

function classifyType(value) {
  const t = normText(value);
  if (!t) return null;
  if (/venta|vendido|salida|ingreso/.test(t)) return 'sale';
  if (/compra|gasto|costo|entrada|inventario|egreso/.test(t)) return 'purchase';
  return null;
}

function rowsFromSheet(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

function extractRecords(rows, sheetName) {
  const columns = detectColumns(rows);
  if (!columns) return { records: [], columns: null, warnings: [`Hoja "${sheetName}": no se detectaron columnas.`] };

  const records = [];
  const warnings = [];

  for (let i = columns.headerRow + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    if (!row.some((c) => String(c || '').trim())) continue;

    const entity =
      columns.entityIdx >= 0 ? String(row[columns.entityIdx] || '').trim() : sheetName.trim();
    const product = columns.productIdx >= 0 ? String(row[columns.productIdx] || '').trim() : '';

    let purchase = columns.purchaseIdx >= 0 ? parseNumber(row[columns.purchaseIdx]) : 0;
    let sale = columns.saleIdx >= 0 ? parseNumber(row[columns.saleIdx]) : 0;

    if (!purchase && !sale && columns.amountIdx >= 0) {
      const amount = parseNumber(row[columns.amountIdx]);
      const kind = columns.typeIdx >= 0 ? classifyType(row[columns.typeIdx]) : null;
      if (kind === 'sale') sale = amount;
      else if (kind === 'purchase') purchase = amount;
      else purchase = amount;
    }

    if (!entity && !product && !purchase && !sale) continue;

    records.push({
      entity: entity || 'Sin entidad',
      product: product || 'Sin producto',
      purchase,
      sale,
      sheet: sheetName,
    });
  }

  if (!records.length) {
    warnings.push(`Hoja "${sheetName}": encabezados detectados pero sin filas con montos.`);
  }

  return { records, columns, warnings };
}

function matchCatalog(text, patterns) {
  const t = normText(text);
  return patterns.some((p) => p.test(t));
}

function matchEntityKey(entityName) {
  const hit = ENTITIES.find((e) => matchCatalog(entityName, e.patterns));
  return hit?.key || null;
}

function matchStarProduct(productName) {
  const hit = STAR_PRODUCTS.find((p) => matchCatalog(productName, p.patterns));
  return hit?.key || null;
}

function matchChickenSource(record) {
  const hits = [];
  for (const source of CHICKEN_SOURCES) {
    if (source.patterns && matchCatalog(record.product, source.patterns)) {
      hits.push(source.key);
      continue;
    }
    if (
      source.entityPatterns &&
      source.productPatterns &&
      matchCatalog(record.entity, source.entityPatterns) &&
      matchCatalog(record.product, source.productPatterns)
    ) {
      hits.push(source.key);
    }
  }
  return hits;
}

function buildReport(records, meta = {}) {
  const byEntity = ENTITIES.map((e) => ({
    key: e.key,
    label: e.label,
    purchases: 0,
  }));

  const starProducts = STAR_PRODUCTS.map((p) => ({
    key: p.key,
    label: p.label,
    purchases: 0,
    sales: 0,
  }));

  const chickenPurchases = CHICKEN_SOURCES.map((s) => ({
    key: s.key,
    label: s.label,
    purchases: 0,
  }));

  let totalPurchases = 0;
  let totalSales = 0;

  for (const row of records) {
    totalPurchases += row.purchase;
    totalSales += row.sale;

    const entityKey = matchEntityKey(row.entity);
    if (entityKey) {
      const bucket = byEntity.find((e) => e.key === entityKey);
      if (bucket) bucket.purchases += row.purchase;
    }

    const starKey = matchStarProduct(row.product);
    if (starKey) {
      const bucket = starProducts.find((p) => p.key === starKey);
      if (bucket) {
        bucket.purchases += row.purchase;
        bucket.sales += row.sale;
      }
    }

    const chickenKeys = matchChickenSource(row);
    for (const key of chickenKeys) {
      const bucket = chickenPurchases.find((c) => c.key === key);
      if (bucket) bucket.purchases += row.purchase;
    }
  }

  const starProductsTotals = starProducts.reduce(
    (acc, p) => ({
      purchases: acc.purchases + p.purchases,
      sales: acc.sales + p.sales,
    }),
    { purchases: 0, sales: 0 }
  );

  const chickenTotal = chickenPurchases.reduce((sum, c) => sum + c.purchases, 0);
  const inventoryToSalesRatio = totalSales > 0 ? totalPurchases / totalSales : null;

  return {
    summary: {
      totalPurchases,
      totalSales,
      globalTotal: totalPurchases + totalSales,
      inventoryToSalesRatio,
      inventoryToSalesLabel:
        inventoryToSalesRatio == null
          ? '—'
          : `${(inventoryToSalesRatio * 100).toFixed(1)}% (gasto inventario / ventas)`,
      rowsProcessed: records.length,
      sheetsProcessed: meta.sheetsProcessed || 0,
    },
    byEntity,
    starProducts,
    starProductsTotals,
    chickenPurchases,
    chickenTotal,
    detectedColumns: meta.detectedColumns || [],
    warnings: meta.warnings || [],
    sampleRows: records.slice(0, 5),
  };
}

function parseWorkbookBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const allRecords = [];
  const detectedColumns = [];
  const warnings = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = rowsFromSheet(sheet);
    const { records, columns, warnings: sheetWarnings } = extractRecords(rows, sheetName);
    allRecords.push(...records);
    warnings.push(...sheetWarnings);
    if (columns) {
      detectedColumns.push({ sheet: sheetName, headers: columns.headers });
    }
  }

  if (!allRecords.length) {
    const err = new Error(
      'No se encontraron datos en el Excel. Use columnas como Entidad, Producto, Compra/Gasto y Venta.'
    );
    err.code = 'INFORME_EMPTY';
    throw err;
  }

  return buildReport(allRecords, {
    sheetsProcessed: workbook.SheetNames.length,
    detectedColumns,
    warnings,
  });
}

module.exports = {
  parseWorkbookBuffer,
  buildReport,
  parseNumber,
  matchEntityKey,
  matchStarProduct,
  detectColumns,
  extractRecords,
};
