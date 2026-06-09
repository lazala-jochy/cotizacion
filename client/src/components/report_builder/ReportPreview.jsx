import ChartViewer from './ChartViewer';

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

export default function ReportPreview({ report, schema, onExport, exporting }) {
  if (!report) return null;

  const { result, meta } = report;
  const rows = result?.rows || [];
  const keys = rows.length
    ? [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith('_'))
    : [];

  return (
    <section className="panel">
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">Vista previa</h2>
          {meta?.explanation && <p className="muted">{meta.explanation}</p>}
          {result?.appliedFilters?.length > 0 && (
            <p className="muted">Filtros: {result.appliedFilters.join(' · ')}</p>
          )}
        </div>
        <div className="report-builder-export-actions">
          <button type="button" className="btn-ghost btn-sm" disabled={exporting} onClick={() => onExport('csv')}>
            CSV
          </button>
          <button type="button" className="btn-ghost btn-sm" disabled={exporting} onClick={() => onExport('xlsx')}>
            Excel
          </button>
          <button type="button" className="btn-ghost btn-sm" disabled={exporting} onClick={() => onExport('pdf')}>
            PDF
          </button>
        </div>
      </div>

      {result?.globalTotals && (
        <div className="report-builder-metrics-grid">
          {result.globalTotals.totalPurchases != null && (
            <div className="report-builder-metric">
              <span>Total compras</span>
              <strong>{formatMoney(result.globalTotals.totalPurchases)}</strong>
            </div>
          )}
          {result.globalTotals.totalSales != null && (
            <div className="report-builder-metric">
              <span>Total ventas</span>
              <strong>{formatMoney(result.globalTotals.totalSales)}</strong>
            </div>
          )}
          {result.globalTotals.estimatedProfit != null && (
            <div className="report-builder-metric">
              <span>Margen estimado</span>
              <strong>{formatMoney(result.globalTotals.estimatedProfit)}</strong>
            </div>
          )}
        </div>
      )}

      <ChartViewer
        chartType={result?.chartType}
        rows={rows}
        chartKey={result?.chartKey}
        chartValue={result?.chartValue}
        chartSeries={result?.chartSeries}
        isRanking={result?.isRanking}
      />

      {rows.length > 0 && (
        <table className="table report-builder-table">
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
                  <td key={k}>{typeof row[k] === 'number' ? formatMoney(row[k]) : row[k]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
