const { normHeader } = require('./utils');

/**
 * Motor basado en reglas + valores únicos del dataset (sin listas fijas).
 * Diseñado para sustituir por LLM en el futuro.
 */
const INTENTS = {
  SPEND_BY_ENTITY: 'spend_by_entity',
  PURCHASE_BY_PRODUCT: 'purchase_by_product',
  SALE_BY_PRODUCT: 'sale_by_product',
  TOP_SALES: 'top_sales',
  TOP_SPEND: 'top_spend',
  TOP_ENTITIES: 'top_entities',
  COMPARE_PURCHASE_SALE: 'compare_purchase_sale',
  MARGIN: 'margin',
  FILTERED_TOTAL: 'filtered_total',
  GLOBAL_TOTALS: 'global_totals',
  CUSTOM: 'custom',
};

function findColumn(columns, semantics = [], labelHints = []) {
  for (const sem of semantics) {
    const hit = columns.find((c) => c.semantic === sem);
    if (hit) return hit.key;
  }
  for (const hint of labelHints) {
    const hit = columns.find((c) => normHeader(c.label).includes(normHeader(hint)));
    if (hit) return hit.key;
  }
  return null;
}

function findAmountColumns(columns) {
  const purchase =
    findColumn(columns, ['purchase'], ['compra', 'gasto', 'entrada', 'costo']) ||
    findColumn(columns, ['amount'], ['total', 'monto']);
  const sale = findColumn(columns, ['sale'], ['venta', 'vendido', 'ingreso']);
  return { purchase, sale };
}

function detectYear(text) {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function matchValueInQuery(text, values = []) {
  const sorted = [...values].sort((a, b) => b.length - a.length);
  for (const val of sorted) {
    const normVal = normHeader(val);
    if (normVal.length >= 2 && text.includes(normVal)) {
      return val;
    }
  }
  return null;
}

function findMatchedFilter(text, columns, uniqueValues, semantics) {
  for (const sem of semantics) {
    const col = columns.find((c) => c.semantic === sem);
    if (!col) continue;
    const matched = matchValueInQuery(text, uniqueValues[col.key] || []);
    if (matched) return { column: col.key, value: matched, label: col.label };
  }
  for (const col of columns) {
    if (!['text', 'generic'].includes(col.type) && col.semantic === 'generic') continue;
    const matched = matchValueInQuery(text, uniqueValues[col.key] || []);
    if (matched) return { column: col.key, value: matched, label: col.label };
  }
  return null;
}

function buildYearFilter(dateCol, year) {
  if (!year || !dateCol) return null;
  return {
    column: dateCol,
    op: 'date_between',
    value: [`${year}-01-01`, `${year}-12-31`],
  };
}

function interpretNaturalLanguage(query, schema = {}) {
  const columns = schema.columns || [];
  const uniqueValues = schema.uniqueValues || {};
  const text = normHeader(query);
  const { purchase, sale } = findAmountColumns(columns);
  const entityCol = findColumn(columns, ['entity', 'branch'], ['proveedor', 'entidad', 'sucursal']);
  const productCol = findColumn(columns, ['product'], ['producto', 'articulo', 'descripcion']);
  const categoryCol = findColumn(columns, ['category'], ['categoria', 'rubro']);
  const dateCol = findColumn(columns, ['date'], ['fecha']);
  const year = detectYear(text);

  const baseFilters = [buildYearFilter(dateCol, year)].filter(Boolean);
  const matched = findMatchedFilter(text, columns, uniqueValues, [
    'product',
    'entity',
    'category',
    'branch',
  ]);

  if (matched) {
    baseFilters.push({ column: matched.column, op: 'eq', value: matched.value });
  }

  const isSale = /vendid|venta|ingreso/.test(text);
  const isPurchase = /gast|compr|costo|entrada/.test(text);

  if (/margen|utilidad|diferencia/.test(text) && purchase && sale) {
    const groupCol = productCol || entityCol || categoryCol;
    return {
      intent: INTENTS.MARGIN,
      explanation: 'Margen estimado (ventas − compras) por grupo detectado en el archivo.',
      config: {
        filters: baseFilters,
        groupBy: groupCol ? [groupCol] : [],
        metrics: [
          { column: purchase, agg: 'sum', label: 'Compras' },
          { column: sale, agg: 'sum', label: 'Ventas' },
        ],
        chartType: 'bar',
        sortBy: 'Ventas',
      },
    };
  }

  if (/compar|vs|versus|compras?\s*y\s*ventas?/.test(text)) {
    const groupCol = productCol || entityCol || categoryCol;
    return {
      intent: INTENTS.COMPARE_PURCHASE_SALE,
      explanation: 'Comparación de compras vs ventas usando columnas detectadas.',
      config: {
        filters: baseFilters,
        groupBy: groupCol ? [groupCol] : [],
        metrics: [
          purchase ? { column: purchase, agg: 'sum', label: 'Compras' } : null,
          sale ? { column: sale, agg: 'sum', label: 'Ventas' } : null,
        ].filter(Boolean),
        chartType: 'bar',
      },
    };
  }

  if (/mas vendido|más vendido|top.*venta|producto.*vendid|ranking.*venta/.test(text)) {
    return {
      intent: INTENTS.TOP_SALES,
      explanation: 'Ranking de productos por ventas (datos del archivo).',
      config: {
        filters: baseFilters,
        groupBy: productCol ? [productCol] : categoryCol ? [categoryCol] : entityCol ? [entityCol] : [],
        metrics: [{ column: sale || purchase, agg: 'sum', label: 'Ventas' }],
        chartType: 'ranking',
        sortBy: 'Ventas',
        sortDir: 'desc',
        limit: 15,
      },
    };
  }

  if (/mayor gasto|mas gasto|más gasto|top.*gasto|ranking.*gasto/.test(text) && productCol) {
    return {
      intent: INTENTS.TOP_SPEND,
      explanation: 'Ranking por mayor gasto en productos del archivo.',
      config: {
        filters: baseFilters,
        groupBy: [productCol],
        metrics: [{ column: purchase || sale, agg: 'sum', label: 'Gastos' }],
        chartType: 'ranking',
        sortBy: 'Gastos',
        limit: 15,
      },
    };
  }

  if (/gast|compr/.test(text) && entityCol && /cada|por\s+cada|todos\s+los/.test(text)) {
    return {
      intent: INTENTS.SPEND_BY_ENTITY,
      explanation: 'Gasto total por cada proveedor/entidad detectada en el archivo.',
      config: {
        filters: baseFilters,
        groupBy: [entityCol],
        metrics: [{ column: purchase || sale, agg: 'sum', label: 'Gastos' }],
        chartType: 'bar',
        sortBy: 'Gastos',
      },
    };
  }

  if (/proveedor|entidad|sucursal/.test(text) && /mas|más|mayor|ranking|top|representa/.test(text)) {
    const metricLabel = isSale ? 'Ventas' : 'Gastos';
    const metricCol = isSale ? sale || purchase : purchase || sale;
    return {
      intent: INTENTS.TOP_ENTITIES,
      explanation: `Totales por ${entityCol ? 'proveedor/entidad' : 'grupo'} detectado en columnas del archivo.`,
      config: {
        filters: baseFilters,
        groupBy: entityCol ? [entityCol] : categoryCol ? [categoryCol] : [],
        metrics: [{ column: metricCol, agg: 'sum', label: metricLabel }],
        chartType: /ranking|mas|más|mayor|top|representa/.test(text) ? 'ranking' : 'pie',
        sortBy: metricLabel,
        limit: 20,
      },
    };
  }

  if (/cada producto|por producto/.test(text) && isSale) {
    return {
      intent: INTENTS.SALE_BY_PRODUCT,
      explanation: 'Total vendido por cada producto del archivo.',
      config: {
        filters: baseFilters,
        groupBy: productCol ? [productCol] : [],
        metrics: [{ column: sale || purchase, agg: 'sum', label: 'Ventas' }],
        chartType: 'bar',
        sortBy: 'Ventas',
      },
    };
  }

  if (/cada producto|por producto/.test(text) || (/compr/.test(text) && productCol)) {
    return {
      intent: INTENTS.PURCHASE_BY_PRODUCT,
      explanation: 'Total comprado por cada producto del archivo.',
      config: {
        filters: baseFilters,
        groupBy: productCol ? [productCol] : [],
        metrics: [{ column: purchase || sale, agg: 'sum', label: 'Compras' }],
        chartType: 'bar',
        sortBy: 'Compras',
      },
    };
  }

  if (matched && (isPurchase || isSale)) {
    return {
      intent: INTENTS.FILTERED_TOTAL,
      explanation: `Total filtrado por ${matched.label}: ${matched.value}.`,
      config: {
        filters: baseFilters,
        metrics: [
          {
            column: isSale ? sale || purchase : purchase || sale,
            agg: 'sum',
            label: isSale ? 'Ventas' : 'Gastos',
          },
        ],
        chartType: 'table',
      },
    };
  }

  if (/total|resumen|globales?/.test(text)) {
    return {
      intent: INTENTS.GLOBAL_TOTALS,
      explanation: 'Totales globales según columnas numéricas detectadas.',
      config: {
        filters: baseFilters,
        metrics: [
          purchase ? { column: purchase, agg: 'sum', label: 'Total compras' } : null,
          sale ? { column: sale, agg: 'sum', label: 'Total ventas' } : null,
        ].filter(Boolean),
        chartType: 'table',
      },
    };
  }

  const defaultGroup = productCol || entityCol || categoryCol;
  return {
    intent: INTENTS.CUSTOM,
    explanation: 'Consulta genérica aplicada sobre columnas detectadas del archivo.',
    config: {
      filters: baseFilters,
      groupBy: defaultGroup ? [defaultGroup] : [],
      metrics: [
        purchase ? { column: purchase, agg: 'sum', label: 'Total' } : null,
      ].filter(Boolean),
      chartType: defaultGroup ? 'bar' : 'table',
    },
  };
}

module.exports = { interpretNaturalLanguage, INTENTS, findColumn };
