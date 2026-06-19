import LoadingOverlay from '../LoadingOverlay';

const AGG_OPTIONS = [
  { value: 'sum', label: 'SUM' },
  { value: 'avg', label: 'AVG' },
  { value: 'count', label: 'COUNT' },
  { value: 'min', label: 'MIN' },
  { value: 'max', label: 'MAX' },
];

const CHART_OPTIONS = [
  { value: 'table', label: 'Tabla' },
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Líneas' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'ranking', label: 'Ranking' },
];

function defaultMetricColumn(columns, numericColumns = []) {
  const key = numericColumns[0] || columns.find((c) => c.type !== 'text')?.key || columns[0]?.key;
  return key;
}

export default function ReportDesigner({ schema, config, onChange, onRun, loading }) {
  const columns = schema?.columns || [];
  if (!columns.length) return null;

  const update = (patch) => onChange({ ...config, ...patch });
  const filters = config.filters || [];
  const groupKinds = config.groupKinds || {};
  const metric = config.metrics?.[0] || {
    column: defaultMetricColumn(columns, schema.numericColumns),
    agg: 'sum',
    label: 'Total',
  };

  const toggleGroup = (key) => {
    const groupBy = config.groupBy || [];
    update({
      groupBy: groupBy.includes(key) ? groupBy.filter((k) => k !== key) : [...groupBy, key],
    });
  };

  const setGroupKind = (key, kind) => {
    const next = { ...groupKinds };
    if (!kind) delete next[key];
    else next[key] = kind;
    update({ groupKinds: next });
  };

  const isActiveFilter = (f) => {
    if (f.op === 'date_between') return Boolean(f.value?.[0] && f.value?.[1]);
    return f.value !== '' && f.value != null;
  };

  const upsertFilter = (columnKey, patch) => {
    const idx = filters.findIndex((f) => f.column === columnKey);
    const next = [...filters];
    if (idx >= 0) next[idx] = { ...next[idx], ...patch };
    else next.push({ column: columnKey, op: 'eq', value: '', ...patch });
    update({ filters: next.filter(isActiveFilter) });
  };

  const clearFilter = (columnKey) => {
    update({ filters: filters.filter((f) => f.column !== columnKey) });
  };

  const numericCols = columns.filter((c) =>
    ['number', 'currency', 'percentage'].includes(c.type)
  );

  return (
    <LoadingOverlay show={loading} message="Ejecutando reporte…">
    <section className="panel">
      <h2 className="panel-title">Constructor de reportes</h2>
      <p className="muted">Filtros, agrupaciones y métricas basados en las columnas detectadas del archivo.</p>

      <div className="report-builder-designer-grid">
        <div>
          <h3>Filtros</h3>
          {schema.filterableColumns?.map((col) => {
            const current = filters.find((f) => f.column === col.key);
            if (col.type === 'date') {
              const range = current?.op === 'date_between' ? current.value : ['', ''];
              return (
                <label key={col.key} className="field">
                  {col.label}
                  <div className="report-builder-date-range">
                    <input
                      type="date"
                      value={range[0] || ''}
                      onChange={(e) =>
                        upsertFilter(col.key, {
                          op: 'date_between',
                          value: [e.target.value, range[1] || ''],
                        })
                      }
                    />
                    <span>—</span>
                    <input
                      type="date"
                      value={range[1] || ''}
                      onChange={(e) =>
                        upsertFilter(col.key, {
                          op: 'date_between',
                          value: [range[0] || '', e.target.value],
                        })
                      }
                    />
                    {current && (
                      <button type="button" className="btn-ghost btn-sm" onClick={() => clearFilter(col.key)}>
                        Limpiar
                      </button>
                    )}
                  </div>
                </label>
              );
            }

            if (col.options?.length) {
              return (
                <label key={col.key} className="field">
                  {col.label}
                  <select
                    value={current?.value || ''}
                    onChange={(e) =>
                      e.target.value
                        ? upsertFilter(col.key, { op: 'eq', value: e.target.value })
                        : clearFilter(col.key)
                    }
                  >
                    <option value="">— Todos —</option>
                    {col.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            return (
              <label key={col.key} className="field">
                {col.label}
                <input
                  type="text"
                  placeholder="Contiene…"
                  value={current?.value || ''}
                  onChange={(e) =>
                    e.target.value
                      ? upsertFilter(col.key, { op: 'contains', value: e.target.value })
                      : clearFilter(col.key)
                  }
                />
              </label>
            );
          })}
        </div>

        <div>
          <h3>Agrupar por</h3>
          <div className="report-builder-chip-list">
            {schema.groupableColumns?.map((col) => (
              <div key={col.key} className="report-builder-chip">
                <label>
                  <input
                    type="checkbox"
                    checked={(config.groupBy || []).includes(col.key)}
                    onChange={() => toggleGroup(col.key)}
                  />
                  <span>{col.label}</span>
                </label>
                {col.supportsMonthYear && (config.groupBy || []).includes(col.key) && (
                  <select
                    value={groupKinds[col.key] || ''}
                    onChange={(e) => setGroupKind(col.key, e.target.value || null)}
                  >
                    <option value="">Valor exacto</option>
                    <option value="month">Por mes</option>
                    <option value="year">Por año</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="report-builder-metrics-row">
        <label className="field">
          Métrica (columna)
          <select
            value={metric.column}
            onChange={(e) =>
              update({
                metrics: [{ ...metric, column: e.target.value }],
              })
            }
          >
            {(numericCols.length ? numericCols : columns).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} ({c.type})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Agregación
          <select
            value={metric.agg}
            onChange={(e) => update({ metrics: [{ ...metric, agg: e.target.value }] })}
          >
            {AGG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Etiqueta
          <input
            type="text"
            value={metric.label || ''}
            onChange={(e) => update({ metrics: [{ ...metric, label: e.target.value }] })}
          />
        </label>
        <label className="field">
          Visualización
          <select
            value={config.chartType || 'table'}
            onChange={(e) => update({ chartType: e.target.value })}
          >
            {CHART_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className="btn-primary" onClick={onRun} disabled={loading}>
        Generar reporte
      </button>
    </section>
    </LoadingOverlay>
  );
}
