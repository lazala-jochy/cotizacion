const { analyzeWorkbook } = require('./ExcelAnalyzer');

const MAX_UNIQUE = 500;
const MAX_RELATION_PAIRS = 25;

function extractUniqueValues(records, columns) {
  const uniqueValues = {};
  const valueCounts = {};

  for (const col of columns) {
    const counts = new Map();
    for (const row of records) {
      const v = row[col.key];
      if (v == null || v === '') continue;
      const s = String(v).trim();
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')
    );
    uniqueValues[col.key] = sorted.slice(0, MAX_UNIQUE).map(([value]) => value);
    valueCounts[col.key] = Object.fromEntries(sorted.slice(0, MAX_UNIQUE));
  }

  return { uniqueValues, valueCounts };
}

function detectRelationships(columns, records) {
  const categorical = columns.filter(
    (c) =>
      c.type === 'text' ||
      ['entity', 'product', 'category', 'branch'].includes(c.semantic)
  );
  const relationships = [];

  for (let i = 0; i < categorical.length; i += 1) {
    for (let j = i + 1; j < categorical.length; j += 1) {
      const colA = categorical[i].key;
      const colB = categorical[j].key;
      const pairCounts = new Map();

      for (const row of records) {
        const va = row[colA];
        const vb = row[colB];
        if (!va || !vb) continue;
        const key = `${va}|||${vb}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }

      const topPairs = [...pairCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_RELATION_PAIRS)
        .map(([key, count]) => {
          const [a, b] = key.split('|||');
          return { [colA]: a, [colB]: b, count };
        });

      if (topPairs.length) {
        relationships.push({
          columns: [colA, colB],
          labels: [categorical[i].label, categorical[j].label],
          topPairs,
        });
      }
    }
  }

  return relationships;
}

function findDimColumn(columns, semantic, labelHints = []) {
  const bySem = columns.find((c) => c.semantic === semantic);
  if (bySem) return bySem;
  for (const hint of labelHints) {
    const h = hint.toLowerCase();
    const hit = columns.find((c) => c.label.toLowerCase().includes(h));
    if (hit) return hit;
  }
  return null;
}

function buildDimensions(columns, uniqueValues) {
  const product = findDimColumn(columns, 'product', ['producto', 'articulo', 'descripcion']);
  const entity = findDimColumn(columns, 'entity', ['proveedor', 'entidad', 'suplidor']);
  const category = findDimColumn(columns, 'category', ['categoria', 'rubro', 'clase']);
  const date = columns.find((c) => c.type === 'date' || c.semantic === 'date');

  const dim = (col, label) =>
    col
      ? {
          key: col.key,
          label: col.label,
          values: uniqueValues[col.key] || [],
        }
      : null;

  return {
    product: dim(product, 'Productos'),
    entity: dim(entity, 'Proveedores'),
    category: dim(category, 'Categorías'),
    date: date ? { key: date.key, label: date.label } : null,
  };
}

function buildDataset(buffer, fileName = 'dataset.xlsx') {
  const { schema: rawSchema, records } = analyzeWorkbook(buffer, fileName);
  const { uniqueValues, valueCounts } = extractUniqueValues(records, rawSchema.columns);
  const relationships = detectRelationships(rawSchema.columns, records);
  const dimensions = buildDimensions(rawSchema.columns, uniqueValues);

  const schema = {
    ...rawSchema,
    uniqueValues,
    valueCounts,
    relationships,
    dimensions,
    numericColumns: rawSchema.columns
      .filter((c) => ['number', 'currency', 'percentage'].includes(c.type))
      .map((c) => c.key),
    dateColumns: rawSchema.columns.filter((c) => c.type === 'date').map((c) => c.key),
    textColumns: rawSchema.columns.filter((c) => c.type === 'text').map((c) => c.key),
    filterableColumns: rawSchema.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
      semantic: c.semantic,
      options: uniqueValues[c.key] || [],
    })),
    groupableColumns: rawSchema.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
      semantic: c.semantic,
      supportsMonthYear: c.type === 'date' || c.semantic === 'date',
    })),
  };

  return { schema, records };
}

module.exports = {
  buildDataset,
  extractUniqueValues,
  detectRelationships,
};
