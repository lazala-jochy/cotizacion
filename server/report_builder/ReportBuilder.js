const { buildDataset } = require('./DatasetBuilder');
const { runQuery } = require('./QueryEngine');
const { findColumn } = require('./NaturalLanguageInterpreter');
const { buildQueryConfig, applyMargin, REPORT_TYPES } = require('./ReportTypeBuilder');
const { buildChartSpec } = require('./ChartEngine');
const { exportCsv, exportXlsx } = require('./SpreadsheetExporter');
const { exportPdf, buildReportHtml } = require('./PdfExporter');
const { renderChartSvg } = require('./ChartEngine');
const { saveDataset, getDataset } = require('./datasetStore');

function analyzeUpload(buffer, fileName, userId) {
  const { schema, records } = buildDataset(buffer, fileName);
  if (!records.length) {
    const err = new Error('El archivo no contiene filas con datos.');
    err.code = 'RB_EMPTY';
    throw err;
  }

  const datasetId = saveDataset({
    userId,
    fileName,
    schema,
    records,
    sheets: schema.sheets,
  });

  return {
    datasetId,
    schema: {
      ...schema,
      preview: records.slice(0, 8),
    },
    llmReady: true,
  };
}

function getDatasetSchema(datasetId, userId) {
  const ds = getDataset(datasetId, userId);
  if (!ds) {
    const err = new Error('Dataset no encontrado o expirado. Vuelva a cargar el archivo.');
    err.code = 'RB_DATASET_EXPIRED';
    throw err;
  }
  return ds;
}

function computeGlobalTotals(records, columns) {
  const purchaseCol = findColumn(columns, ['purchase'], ['compra', 'gasto']);
  const saleCol = findColumn(columns, ['sale'], ['venta']);
  const globalTotals = {
    totalPurchases: purchaseCol
      ? records.reduce((s, r) => s + (Number(r[purchaseCol]) || 0), 0)
      : null,
    totalSales: saleCol ? records.reduce((s, r) => s + (Number(r[saleCol]) || 0), 0) : null,
  };
  if (globalTotals.totalPurchases != null && globalTotals.totalSales != null) {
    globalTotals.estimatedProfit = globalTotals.totalSales - globalTotals.totalPurchases;
    globalTotals.marginRatio =
      globalTotals.totalSales > 0
        ? (globalTotals.totalSales - globalTotals.totalPurchases) / globalTotals.totalSales
        : null;
  }
  return globalTotals;
}

function executeReport({ datasetId, userId, config, reportType, selections }) {
  const ds = getDatasetSchema(datasetId, userId);
  const { schema, records } = ds;

  let queryConfig = config || {};
  let meta = { source: 'manual' };

  if (reportType) {
    queryConfig = buildQueryConfig(schema, { reportType, selections: selections || {} });
    meta = {
      source: 'generator',
      reportType,
      reportLabel: REPORT_TYPES[reportType]?.label || reportType,
      selections: selections || {},
    };
  }

  let result = runQuery(records, queryConfig, schema.columns);

  if (queryConfig.computeMargin && result.rows?.length) {
    let rows = applyMargin(result.rows);
    if (queryConfig.sortBy === 'Margen') {
      rows = [...rows].sort((a, b) => (b.Margen || 0) - (a.Margen || 0));
    }
    result = { ...result, rows };
  }

  const chartSpec = buildChartSpec(result);
  const globalTotals = computeGlobalTotals(records, schema.columns);

  return {
    datasetId,
    fileName: ds.fileName,
    meta,
    queryConfig,
    result: {
      ...result,
      chartSpec,
      globalTotals,
    },
  };
}

async function exportDatasetReport({
  datasetId,
  userId,
  format,
  rows,
  summary,
  title,
  filters,
  query,
  chartSpec,
}) {
  getDatasetSchema(datasetId, userId);
  const fmt = String(format || 'csv').toLowerCase();

  if (fmt === 'csv') {
    return { contentType: 'text/csv; charset=utf-8', extension: 'csv', data: exportCsv(rows) };
  }

  if (fmt === 'xlsx' || fmt === 'excel') {
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
      data: exportXlsx(rows, title),
      binary: true,
    };
  }

  if (fmt === 'pdf') {
    const chartSvg = renderChartSvg(chartSpec);
    const exported = await exportPdf({
      title: title || 'Reporte',
      filters: filters || [],
      rows: rows || [],
      summary: summary || {},
      chartSvg,
      query,
    });
    if (exported.fallback) {
      return {
        ...exported,
        html: exported.data,
      };
    }
    return exported;
  }

  throw new Error(`Formato no soportado: ${format}`);
}

module.exports = {
  analyzeUpload,
  executeReport,
  exportDatasetReport,
  getDatasetSchema,
  buildReportHtml,
};
