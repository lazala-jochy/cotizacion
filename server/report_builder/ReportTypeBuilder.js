const { findColumn } = require('./NaturalLanguageInterpreter');

const REPORT_TYPES = {
  purchases: { label: 'Compras', chartType: 'bar' },
  sales: { label: 'Ventas', chartType: 'bar' },
  compare: { label: 'Compras vs Ventas', chartType: 'bar' },
  inventory: { label: 'Inventario', chartType: 'table' },
  ranking: { label: 'Ranking', chartType: 'ranking' },
  profitability: { label: 'Rentabilidad', chartType: 'bar' },
};

function buildFilters(schema, selections = {}) {
  const columns = schema.columns || [];
  const filters = [];

  const dateCol = schema.dimensions?.date?.key || findColumn(columns, ['date'], ['fecha']);
  if (selections.dateFrom && selections.dateTo && dateCol) {
    filters.push({
      column: dateCol,
      op: 'date_between',
      value: [selections.dateFrom, selections.dateTo],
    });
  }

  const productCol = schema.dimensions?.product?.key;
  if (selections.products?.length && productCol) {
    filters.push({ column: productCol, op: 'in', value: selections.products });
  }

  const entityCol = schema.dimensions?.entity?.key;
  if (selections.providers?.length && entityCol) {
    filters.push({ column: entityCol, op: 'in', value: selections.providers });
  }

  const categoryCol = schema.dimensions?.category?.key;
  if (selections.categories?.length && categoryCol) {
    filters.push({ column: categoryCol, op: 'in', value: selections.categories });
  }

  return filters;
}

function resolveColumns(schema) {
  const columns = schema.columns || [];
  const purchase =
    findColumn(columns, ['purchase'], ['compra', 'gasto', 'entrada', 'costo', 'inventario']) ||
    schema.numericColumns?.[0];
  const sale = findColumn(columns, ['sale'], ['venta', 'vendido', 'salida', 'ingreso']);
  const productCol =
    schema.dimensions?.product?.key || findColumn(columns, ['product'], ['producto', 'articulo']);
  const entityCol =
    schema.dimensions?.entity?.key || findColumn(columns, ['entity', 'branch'], ['proveedor', 'entidad']);
  const categoryCol =
    schema.dimensions?.category?.key || findColumn(columns, ['category'], ['categoria', 'rubro']);

  const groupCol = productCol || entityCol || categoryCol;
  return { purchase, sale, productCol, entityCol, categoryCol, groupCol };
}

function buildQueryConfig(schema, { reportType, selections = {} }) {
  const type = REPORT_TYPES[reportType] ? reportType : 'purchases';
  const filters = buildFilters(schema, selections);
  const { purchase, sale, productCol, entityCol, groupCol } = resolveColumns(schema);

  const base = {
    filters,
    chartType: REPORT_TYPES[type].chartType,
    reportType: type,
  };

  if (type === 'purchases') {
    return {
      ...base,
      groupBy: groupCol ? [groupCol] : [],
      metrics: purchase ? [{ column: purchase, agg: 'sum', label: 'Compras' }] : [],
      sortBy: 'Compras',
    };
  }

  if (type === 'sales') {
    return {
      ...base,
      groupBy: groupCol ? [groupCol] : [],
      metrics: sale ? [{ column: sale, agg: 'sum', label: 'Ventas' }] : [],
      sortBy: 'Ventas',
    };
  }

  if (type === 'compare') {
    return {
      ...base,
      groupBy: groupCol ? [groupCol] : [],
      metrics: [
        purchase ? { column: purchase, agg: 'sum', label: 'Compras' } : null,
        sale ? { column: sale, agg: 'sum', label: 'Ventas' } : null,
      ].filter(Boolean),
    };
  }

  if (type === 'inventory') {
    const invCol = purchase || findColumn(schema.columns, ['quantity'], ['cantidad', 'unidades']);
    return {
      ...base,
      groupBy: productCol ? [productCol] : groupCol ? [groupCol] : [],
      metrics: invCol ? [{ column: invCol, agg: 'sum', label: 'Inventario' }] : [],
      sortBy: 'Inventario',
    };
  }

  if (type === 'ranking') {
    const metricCol = sale || purchase;
    return {
      ...base,
      groupBy: groupCol ? [groupCol] : [],
      metrics: metricCol ? [{ column: metricCol, agg: 'sum', label: 'Total' }] : [],
      sortBy: 'Total',
      sortDir: 'desc',
      limit: 25,
    };
  }

  if (type === 'profitability') {
    return {
      ...base,
      groupBy: groupCol ? [groupCol] : [],
      metrics: [
        purchase ? { column: purchase, agg: 'sum', label: 'Compras' } : null,
        sale ? { column: sale, agg: 'sum', label: 'Ventas' } : null,
      ].filter(Boolean),
      computeMargin: true,
      sortBy: 'Margen',
      sortDir: 'desc',
    };
  }

  return base;
}

function applyMargin(rows = []) {
  return rows.map((row) => {
    const compras = Number(row.Compras) || 0;
    const ventas = Number(row.Ventas) || 0;
    return { ...row, Margen: ventas - compras };
  });
}

module.exports = {
  REPORT_TYPES,
  buildQueryConfig,
  buildFilters,
  applyMargin,
};
