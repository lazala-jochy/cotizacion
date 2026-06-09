import ChartViewer from '../report_builder/ChartViewer';
import { IconDownload } from './icons';

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(n);
}

function columnLabel(schema, key) {
  const col = schema?.columns?.find((c) => c.key === key);
  if (col) return col.label;
  return key.replace(/_mes$/, ' (mes)').replace(/_anio$/, ' (año)');
}

export default function ReportResults({ report, schema, onExport, exporting }) {
  if (!report) {
    return (
      <section className="report-studio-results report-studio-results-empty">
        <div className="report-studio-empty-state">
          <p className="report-studio-empty-title">Aún no hay resultados</p>
          <p className="muted">
            Configure filtros, elija el tipo de reporte y pulse <strong>Generar Informe</strong>.
          </p>
        </div>
      </section>
    );
  }

  const { result, meta } = report;
  const rows = result?.rows || [];
  const keys = rows.length
    ? [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith('_'))
    : [];

  const primaryMetric = keys.find((k) => typeof rows[0]?.[k] === 'number');

  return (
    <section className="report-studio-results">
      <header className="report-studio-results-head">
        <div>
          <span className="report-studio-results-eyebrow">Resultado</span>
          <h2>{meta?.reportLabel || 'Informe generado'}</h2>
          {result?.appliedFilters?.length > 0 ? (
            <div className="report-studio-results-filters">
              {result.appliedFilters.map((f) => (
                <span key={f} className="report-studio-results-filter-chip">
                  {f}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Sin filtros — datos completos del archivo</p>
          )}
        </div>
        <div className="report-studio-export-group">
          <button
            type="button"
            className="report-studio-export-btn"
            disabled={exporting}
            onClick={() => onExport('pdf')}
          >
            <IconDownload /> PDF
          </button>
          <button
            type="button"
            className="report-studio-export-btn"
            disabled={exporting}
            onClick={() => onExport('xlsx')}
          >
            <IconDownload /> Excel
          </button>
          <button
            type="button"
            className="report-studio-export-btn"
            disabled={exporting}
            onClick={() => onExport('csv')}
          >
            <IconDownload /> CSV
          </button>
        </div>
      </header>

      <div className="report-studio-kpi-row">
        <div className="report-studio-kpi">
          <span className="report-studio-kpi-label">Registros analizados</span>
          <strong>{result?.summary?.count?.toLocaleString('es-DO') ?? '—'}</strong>
        </div>
        {result?.summary?.groups != null && (
          <div className="report-studio-kpi">
            <span className="report-studio-kpi-label">Grupos en reporte</span>
            <strong>{result.summary.groups}</strong>
          </div>
        )}
        {result?.globalTotals?.totalPurchases != null && (
          <div className="report-studio-kpi tone-blue">
            <span className="report-studio-kpi-label">Compras (archivo)</span>
            <strong>{formatMoney(result.globalTotals.totalPurchases)}</strong>
          </div>
        )}
        {result?.globalTotals?.totalSales != null && (
          <div className="report-studio-kpi tone-green">
            <span className="report-studio-kpi-label">Ventas (archivo)</span>
            <strong>{formatMoney(result.globalTotals.totalSales)}</strong>
          </div>
        )}
        {primaryMetric && rows[0]?.[primaryMetric] != null && (
          <div className="report-studio-kpi tone-violet">
            <span className="report-studio-kpi-label">Primera fila · {columnLabel(schema, primaryMetric)}</span>
            <strong>{formatMoney(rows[0][primaryMetric])}</strong>
          </div>
        )}
      </div>

      {rows.length > 0 && result?.chartType !== 'table' && (
        <div className="report-studio-chart-card">
          <ChartViewer
            chartType={result?.chartType}
            rows={rows}
            chartKey={result?.chartKey}
            chartValue={result?.chartValue}
            chartSeries={result?.chartSeries}
            isRanking={result?.isRanking}
          />
        </div>
      )}

      {rows.length > 0 ? (
        <div className="report-studio-table-card">
          <div className="report-studio-table-head">
            <h3>Detalle</h3>
            <span className="muted">{rows.length} fila(s)</span>
          </div>
          <div className="report-studio-table-scroll">
            <table className="table report-studio-table">
              <thead>
                <tr>
                  {keys.map((k) => (
                    <th key={k}>{columnLabel(schema, k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {keys.map((k) => (
                      <td key={k} className={typeof row[k] === 'number' ? 'is-num' : ''}>
                        {typeof row[k] === 'number' ? formatMoney(row[k]) : row[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="report-studio-empty-state is-inline">
          <p className="report-studio-empty-title">Sin datos para estos filtros</p>
          <p className="muted">Pruebe ampliar la selección o cambiar el tipo de reporte.</p>
        </div>
      )}
    </section>
  );
}
