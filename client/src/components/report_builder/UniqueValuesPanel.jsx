import { useState } from 'react';

export default function UniqueValuesPanel({ schema }) {
  const [openKey, setOpenKey] = useState(null);
  if (!schema?.filterableColumns?.length) return null;

  const categorical = schema.filterableColumns.filter(
    (c) => c.options?.length > 0 && c.type !== 'date'
  );

  if (!categorical.length) return null;

  return (
    <section className="panel">
      <h2 className="panel-title">Valores detectados en el archivo</h2>
      <p className="muted">Extraídos automáticamente de cada columna. Sin listas predefinidas.</p>
      <div className="report-builder-unique-grid">
        {categorical.map((col) => (
          <div key={col.key} className="report-builder-unique-col">
            <button
              type="button"
              className="report-builder-unique-toggle"
              onClick={() => setOpenKey(openKey === col.key ? null : col.key)}
            >
              <strong>{col.label}</strong>
              <span className="muted">{col.options.length} valores</span>
            </button>
            {openKey === col.key && (
              <ul className="report-builder-unique-list">
                {col.options.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
