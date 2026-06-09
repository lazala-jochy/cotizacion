const { normHeader, parseNumber, parseDate } = require('./utils');

const AGG_FNS = {
  sum: (vals) => vals.reduce((a, b) => a + b, 0),
  avg: (vals) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0),
  count: (vals) => vals.length,
  min: (vals) => (vals.length ? Math.min(...vals) : 0),
  max: (vals) => (vals.length ? Math.max(...vals) : 0),
};

function coerceNumber(v) {
  if (typeof v === 'number') return v;
  return parseNumber(v) ?? 0;
}

function matchFilter(record, filter) {
  const val = record[filter.column];
  const target = filter.value;
  const op = filter.op || 'contains';

  if (op === 'eq') return String(val).toLowerCase() === String(target).toLowerCase();
  if (op === 'neq') return String(val).toLowerCase() !== String(target).toLowerCase();
  if (op === 'contains') return normHeader(val).includes(normHeader(target));
  if (op === 'gte') return coerceNumber(val) >= coerceNumber(target);
  if (op === 'lte') return coerceNumber(val) <= coerceNumber(target);
  if (op === 'between' && Array.isArray(target)) {
    const n = coerceNumber(val);
    return n >= coerceNumber(target[0]) && n <= coerceNumber(target[1]);
  }
  if (op === 'date_between' && Array.isArray(target)) {
    const d = parseDate(val);
    if (!d) return false;
    const from = parseDate(target[0]);
    const to = parseDate(target[1]);
    if (!from || !to) return true;
    return d >= from && d <= to;
  }
  if (op === 'in' && Array.isArray(target)) {
    return target.some((t) => normHeader(val) === normHeader(t));
  }
  return true;
}

function applyFilters(records, filters = []) {
  if (!filters.length) return records;
  return records.filter((row) => filters.every((f) => matchFilter(row, f)));
}

function monthKey(value) {
  const d = parseDate(value);
  if (!d) return 'Sin fecha';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function yearKey(value) {
  const d = parseDate(value);
  if (!d) return 'Sin año';
  return String(d.getFullYear());
}

function resolveGroupValue(record, col, groupKind) {
  if (groupKind === 'month') return monthKey(record[col]);
  if (groupKind === 'year') return yearKey(record[col]);
  return record[col] ?? '(vacío)';
}

function describeFilters(filters = [], columns = []) {
  return filters.map((f) => {
    const col = columns.find((c) => c.key === f.column);
    const label = col?.label || f.column;
    if (f.op === 'between' || f.op === 'date_between') {
      return `${label}: ${f.value[0]} — ${f.value[1]}`;
    }
    if (f.op === 'in' && Array.isArray(f.value) && f.value.length) {
      return `${label}: ${f.value.join(', ')}`;
    }
    return `${label} ${f.op} ${f.value}`;
  });
}

function runQuery(records, config = {}, columns = []) {
  const {
    filters = [],
    groupBy = [],
    groupKinds = {},
    metrics = [],
    sortBy,
    sortDir = 'desc',
    limit = 500,
    chartType = 'table',
  } = config;

  const filtered = applyFilters(records, filters);
  const appliedFilters = describeFilters(filters, columns);

  if (!metrics.length && !groupBy.length) {
    return {
      rows: filtered.slice(0, limit),
      summary: { count: filtered.length },
      chartType,
      appliedFilters,
    };
  }

  if (!groupBy.length) {
    const summary = {};
    for (const m of metrics) {
      const vals = filtered.map((r) => coerceNumber(r[m.column])).filter((n) => Number.isFinite(n));
      const fn = AGG_FNS[m.agg] || AGG_FNS.sum;
      summary[m.label || `${m.agg}_${m.column}`] = fn(vals);
    }
    return {
      rows: [summary],
      summary: { count: filtered.length, ...summary },
      chartType,
      appliedFilters,
    };
  }

  const buckets = new Map();
  for (const row of filtered) {
    const parts = groupBy.map((col) => resolveGroupValue(row, col, groupKinds[col]));
    const key = parts.join(' · ');
    if (!buckets.has(key)) {
      const base = {};
      groupBy.forEach((col, i) => {
        const kind = groupKinds[col];
        const groupLabel =
          kind === 'month' ? `${col}_mes` : kind === 'year' ? `${col}_anio` : col;
        base[groupLabel] = parts[i];
      });
      buckets.set(key, { ...base, _group: key, _values: {} });
    }
    const bucket = buckets.get(key);
    for (const m of metrics) {
      const label = m.label || `${m.agg}_${m.column}`;
      if (!bucket._values[label]) bucket._values[label] = [];
      bucket._values[label].push(coerceNumber(row[m.column]));
    }
  }

  let rows = [...buckets.values()].map((b) => {
    const out = { ...b };
    delete out._values;
    for (const [label, vals] of Object.entries(b._values)) {
      const metric = metrics.find((m) => (m.label || `${m.agg}_${m.column}`) === label);
      const fn = AGG_FNS[metric?.agg] || AGG_FNS.sum;
      out[label] = fn(vals);
    }
    delete out._group;
    return out;
  });

  const primaryMetric = metrics[0] ? metrics[0].label || `${metrics[0].agg}_${metrics[0].column}` : null;

  if (sortBy || chartType === 'ranking') {
    const key = sortBy || primaryMetric;
    rows.sort((a, b) => {
      const av = coerceNumber(a[key]);
      const bv = coerceNumber(b[key]);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }

  const limited = rows.slice(0, chartType === 'ranking' ? limit || 15 : limit);
  const totals = {};
  for (const m of metrics) {
    const label = m.label || `${m.agg}_${m.column}`;
    totals[label] = limited.reduce((s, r) => s + coerceNumber(r[label]), 0);
  }

  const groupKey =
    groupBy.length === 1
      ? groupKinds[groupBy[0]] === 'month'
        ? `${groupBy[0]}_mes`
        : groupKinds[groupBy[0]] === 'year'
          ? `${groupBy[0]}_anio`
          : groupBy[0]
      : groupBy[0];

  return {
    rows: limited,
    summary: { count: filtered.length, groups: limited.length, ...totals },
    chartType: chartType === 'ranking' ? 'bar' : chartType,
    chartKey: groupKey,
    chartValue: primaryMetric,
    chartSeries: metrics.map((m) => m.label || `${m.agg}_${m.column}`),
    appliedFilters,
    isRanking: chartType === 'ranking',
  };
}

module.exports = { runQuery, applyFilters, AGG_FNS, describeFilters };
