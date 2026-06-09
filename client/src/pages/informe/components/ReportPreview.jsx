function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function formatPct(n) {
  return `${((n || 0) * 100).toFixed(1)}%`;
}

export default function ReportPreview({ previewData, sections, loading, onRefresh, onGenerate }) {
  const active = (sections || []).filter((s) => s.active);
  const data = previewData?.sections || {};

  return (
    <section className="panel informe-xl-preview">
      <header className="informe-xl-preview-head">
        <div>
          <h2>Vista previa</h2>
          <p className="muted">Resumen de los datos que se incluirán en el Excel generado.</p>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={onRefresh} disabled={loading}>
          Actualizar preview
        </button>
      </header>

      {!previewData && (
        <p className="muted informe-xl-preview-empty">
          Configure hojas, columnas y secciones, luego actualice la vista previa.
        </p>
      )}

      {previewData && (
        <div className="informe-xl-preview-sections">
          {active.map((section) => {
            const block = data[section.id];
            if (!block) return null;

            if (section.id === 'gastos_entidad') {
              return (
                <div key={section.id} className="informe-xl-preview-block">
                  <h3>{section.label}</h3>
                  <table className="table informe-xl-table">
                    <thead>
                      <tr>
                        <th>Entidad</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows?.map((r) => (
                        <tr key={r.label}>
                          <td>{r.label}</td>
                          <td>{formatMoney(r.total)}</td>
                        </tr>
                      ))}
                      <tr className="informe-xl-table-total">
                        <td>Total</td>
                        <td>{formatMoney(block.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }

            if (section.id === 'productos_estrella') {
              return (
                <div key={section.id} className="informe-xl-preview-block">
                  <h3>{section.label}</h3>
                  <table className="table informe-xl-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Unidades</th>
                        <th>Total</th>
                        <th>% Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows?.map((r) => (
                        <tr key={r.label}>
                          <td>{r.label}</td>
                          <td>{r.unidades}</td>
                          <td>{formatMoney(r.total)}</td>
                          <td>{formatPct(r.pct)}</td>
                        </tr>
                      ))}
                      <tr className="informe-xl-table-total">
                        <td>Sumatoria</td>
                        <td>{block.totals?.unidades}</td>
                        <td>{formatMoney(block.totals?.total)}</td>
                        <td>{formatPct(block.totals?.pct)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }

            if (section.id === 'ratio_gasto') {
              return (
                <div key={section.id} className="informe-xl-preview-block">
                  <h3>{section.label}</h3>
                  <div className="informe-xl-kpi-row">
                    <div className="informe-xl-kpi">
                      <span>Ventas</span>
                      <strong>{formatMoney(block.totalVentas)}</strong>
                    </div>
                    <div className="informe-xl-kpi">
                      <span>Gastos</span>
                      <strong>{formatMoney(block.totalGastos)}</strong>
                    </div>
                    <div className="informe-xl-kpi accent">
                      <span>Ratio</span>
                      <strong>{formatPct(block.ratio)}</strong>
                    </div>
                  </div>
                </div>
              );
            }

            if (section.id === 'globalizado') {
              return (
                <div key={section.id} className="informe-xl-preview-block">
                  <h3>{section.label}</h3>
                  <div className="informe-xl-kpi-row">
                    <div className="informe-xl-kpi">
                      <span>Ventas</span>
                      <strong>{formatMoney(block.totalVentas)}</strong>
                    </div>
                    <div className="informe-xl-kpi">
                      <span>Gastos</span>
                      <strong>{formatMoney(block.totalGastos)}</strong>
                    </div>
                    <div
                      className={`informe-xl-kpi${block.resultado >= 0 ? ' positive' : ''}`}
                    >
                      <span>Resultado</span>
                      <strong>{formatMoney(block.resultado)}</strong>
                    </div>
                  </div>
                </div>
              );
            }

            if (section.id === 'categoria_compra') {
              return (
                <div key={section.id} className="informe-xl-preview-block">
                  <h3>{block.label || section.label}</h3>
                  <table className="table informe-xl-table">
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th>Monto</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows?.map((r) => (
                        <tr key={r.label}>
                          <td>{r.label}</td>
                          <td>{formatMoney(r.total)}</td>
                          <td>{formatPct(r.pct)}</td>
                        </tr>
                      ))}
                      <tr className="informe-xl-table-total">
                        <td>Total</td>
                        <td>{formatMoney(block.total)}</td>
                        <td>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      <div className="informe-xl-generate-bar">
        <button type="button" className="btn-primary informe-xl-generate-btn" onClick={onGenerate} disabled={loading}>
          {loading ? 'Generando Excel…' : 'Generar Reporte Excel'}
        </button>
      </div>
    </section>
  );
}
