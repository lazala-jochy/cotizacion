import { useMemo, useState } from 'react';

export default function CheckboxFilterGroup({ title, icon, options = [], selected = [], onChange }) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  if (!options.length) return null;

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

  return (
    <div className={`report-studio-filter-card${collapsed ? ' is-collapsed' : ''}`}>
      <div className="report-studio-filter-card-head">
        <button
          type="button"
          className="report-studio-filter-card-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {icon && <span className="report-studio-filter-icon">{icon}</span>}
          <div className="report-studio-filter-card-titles">
            <strong>{title}</strong>
            <span className="muted">
              {selected.length
                ? `${selected.length} de ${options.length} seleccionados`
                : `${options.length} detectados · todos incluidos`}
            </span>
          </div>
          <span className="report-studio-filter-count">{options.length}</span>
        </button>
        <div className="report-studio-filter-card-actions">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onChange([...options])}
            disabled={allSelected}
          >
            Todos
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onChange([])}
            disabled={noneSelected}
          >
            Ninguno
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="report-studio-filter-card-body">
          {options.length > 8 && (
            <input
              type="search"
              className="report-studio-filter-search"
              placeholder={`Buscar en ${title.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <div className="report-studio-pill-grid">
            {filtered.map((opt) => {
              const on = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`report-studio-pill${on ? ' is-on' : ''}`}
                  onClick={() => toggle(opt)}
                  aria-pressed={on}
                >
                  <span className="report-studio-pill-check" aria-hidden="true">
                    {on ? '✓' : ''}
                  </span>
                  {opt}
                </button>
              );
            })}
            {!filtered.length && <p className="muted report-studio-filter-empty">Sin coincidencias</p>}
          </div>
        </div>
      )}
    </div>
  );
}
