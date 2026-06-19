import CheckboxFilterGroup from './CheckboxFilterGroup';
import ActiveFiltersBar from './ActiveFiltersBar';
import LoadingOverlay from '../LoadingOverlay';
import { IconSpark, ReportTypeIcon } from './icons';

const REPORT_TYPES = [
  { id: 'purchases', label: 'Compras', desc: 'Totales comprados', color: 'blue' },
  { id: 'sales', label: 'Ventas', desc: 'Totales vendidos', color: 'green' },
  { id: 'compare', label: 'Compras vs Ventas', desc: 'Comparación visual', color: 'violet' },
  { id: 'inventory', label: 'Inventario', desc: 'Entradas y stock', color: 'amber' },
  { id: 'ranking', label: 'Ranking', desc: 'Top por volumen', color: 'rose' },
  { id: 'profitability', label: 'Rentabilidad', desc: 'Margen estimado', color: 'teal' },
];

export default function ReportGeneratorForm({
  schema,
  selections,
  onSelectionsChange,
  reportType,
  onReportTypeChange,
  onGenerate,
  loading,
}) {
  if (!schema) return null;

  const dims = schema.dimensions || {};
  const update = (patch) => onSelectionsChange({ ...selections, ...patch });

  const clearAll = () =>
    onSelectionsChange({
      products: [],
      providers: [],
      categories: [],
      dateFrom: '',
      dateTo: '',
    });

  return (
    <LoadingOverlay show={loading} message="Generando informe…">
    <div className="report-studio-builder">
      <div className="report-studio-builder-main">
        <section className="report-studio-panel">
          <header className="report-studio-panel-head">
            <div>
              <h2>Filtros del informe</h2>
              <p>Seleccione qué datos incluir. Vacío = todo el archivo.</p>
            </div>
          </header>

          <div className="report-studio-filters-stack">
            <CheckboxFilterGroup
              title={dims.product?.label || 'Productos'}
              options={dims.product?.values || []}
              selected={selections.products || []}
              onChange={(products) => update({ products })}
            />
            <CheckboxFilterGroup
              title={dims.entity?.label || 'Proveedores'}
              options={dims.entity?.values || []}
              selected={selections.providers || []}
              onChange={(providers) => update({ providers })}
            />
            <CheckboxFilterGroup
              title={dims.category?.label || 'Categorías'}
              options={dims.category?.values || []}
              selected={selections.categories || []}
              onChange={(categories) => update({ categories })}
            />
          </div>

          {dims.date && (
            <div className="report-studio-date-card">
              <div className="report-studio-date-head">
                <strong>{dims.date.label || 'Rango de fechas'}</strong>
                <span className="muted">Opcional</span>
              </div>
              <div className="report-studio-date-inputs">
                <label>
                  <span>Desde</span>
                  <input
                    type="date"
                    value={selections.dateFrom || ''}
                    onChange={(e) => update({ dateFrom: e.target.value })}
                  />
                </label>
                <label>
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={selections.dateTo || ''}
                    onChange={(e) => update({ dateTo: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="report-studio-sidebar">
        <section className="report-studio-panel report-studio-panel-accent">
          <header className="report-studio-panel-head">
            <div>
              <h2>Tipo de reporte</h2>
              <p>Define qué métrica calcular con los filtros.</p>
            </div>
          </header>

          <div className="report-studio-type-list">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`report-studio-type-card tone-${t.color}${reportType === t.id ? ' is-active' : ''}`}
                onClick={() => onReportTypeChange(t.id)}
                aria-pressed={reportType === t.id}
              >
                <span className="report-studio-type-icon">
                  <ReportTypeIcon type={t.id} />
                </span>
                <span className="report-studio-type-text">
                  <strong>{t.label}</strong>
                  <small>{t.desc}</small>
                </span>
                <span className="report-studio-type-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <div className="report-studio-action-card">
          <ActiveFiltersBar selections={selections} schema={schema} onClear={clearAll} />
          <button
            type="button"
            className="btn-primary report-studio-generate-btn"
            onClick={onGenerate}
            disabled={loading}
          >
            <IconSpark />
            Generar Informe
          </button>
        </div>
      </aside>
    </div>
    </LoadingOverlay>
  );
}
