const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runQuery } = require('../server/report_builder/QueryEngine');
const { buildQueryConfig, applyMargin } = require('../server/report_builder/ReportTypeBuilder');
const { inferSemantic } = require('../server/report_builder/ExcelAnalyzer');
const { extractUniqueValues, buildDataset } = require('../server/report_builder/DatasetBuilder');

const sampleColumns = [
  { key: 'fecha', label: 'Fecha', type: 'date', semantic: 'date' },
  { key: 'proveedor', label: 'Proveedor', type: 'text', semantic: 'entity' },
  { key: 'producto', label: 'Producto', type: 'text', semantic: 'product' },
  { key: 'compra', label: 'Compra', type: 'currency', semantic: 'purchase' },
  { key: 'venta', label: 'Venta', type: 'currency', semantic: 'sale' },
];

const sampleRecords = [
  { proveedor: 'APREZIO', producto: 'Chuleta', compra: 1000, venta: 0 },
  { proveedor: 'LA TORRE', producto: 'Costilla', compra: 500, venta: 300 },
  { proveedor: 'PRIMAS', producto: 'Alitas', compra: 400, venta: 200 },
  { proveedor: 'POLLO MAX', producto: 'Pollo Entero', compra: 800, venta: 0 },
];

const sampleSchema = {
  columns: sampleColumns,
  numericColumns: ['compra', 'venta'],
  dimensions: {
    product: { key: 'producto', label: 'Producto', values: ['Chuleta', 'Costilla', 'Alitas', 'Pollo Entero'] },
    entity: { key: 'proveedor', label: 'Proveedor', values: ['APREZIO', 'LA TORRE', 'PRIMAS', 'POLLO MAX'] },
    category: null,
    date: { key: 'fecha', label: 'Fecha' },
  },
  uniqueValues: {
    producto: ['Chuleta', 'Costilla', 'Alitas', 'Pollo Entero'],
    proveedor: ['APREZIO', 'LA TORRE', 'PRIMAS', 'POLLO MAX'],
  },
};

describe('report_builder QueryEngine', () => {
  it('filtra por productos seleccionados (multi-select)', () => {
    const config = buildQueryConfig(sampleSchema, {
      reportType: 'purchases',
      selections: { products: ['Chuleta', 'Alitas'] },
    });
    const result = runQuery(sampleRecords, config, sampleColumns);
    assert.equal(result.rows.length, 2);
    assert.ok(result.rows.some((r) => r.producto === 'Chuleta'));
    assert.ok(result.rows.some((r) => r.producto === 'Alitas'));
  });

  it('sin selección incluye todos los productos', () => {
    const config = buildQueryConfig(sampleSchema, {
      reportType: 'purchases',
      selections: {},
    });
    const result = runQuery(sampleRecords, config, sampleColumns);
    assert.equal(result.rows.length, 4);
  });
});

describe('report_builder ReportTypeBuilder', () => {
  it('genera reporte de compras vs ventas', () => {
    const config = buildQueryConfig(sampleSchema, { reportType: 'compare', selections: {} });
    assert.equal(config.metrics.length, 2);
    assert.equal(config.metrics[0].label, 'Compras');
    assert.equal(config.metrics[1].label, 'Ventas');
  });

  it('calcula margen en rentabilidad', () => {
    const rows = applyMargin([{ Compras: 100, Ventas: 250 }]);
    assert.equal(rows[0].Margen, 150);
  });
});

describe('report_builder DatasetBuilder', () => {
  it('extrae valores únicos del archivo', () => {
    const { uniqueValues } = extractUniqueValues(sampleRecords, sampleColumns);
    assert.ok(uniqueValues.producto.includes('Chuleta'));
    assert.ok(uniqueValues.proveedor.includes('POLLO MAX'));
  });

  it('infiere semántica de columnas', () => {
    assert.equal(inferSemantic('Proveedor'), 'entity');
    assert.equal(inferSemantic('Producto'), 'product');
  });
});
