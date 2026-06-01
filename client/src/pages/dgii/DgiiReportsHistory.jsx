import { useEffect, useState } from 'react';
import { api } from '../../api';

const TYPE_LABELS = {
  '606': 'Compras (606)',
  '607': 'Ventas (607)',
  '608': 'Anulados (608)',
};

export default function DgiiReportsHistory() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.dgii
      .listReports(filter ? { report_type: filter } : {})
      .then(setReports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleDownload = async (id, filename) => {
    try {
      await api.dgii.downloadReport(id, filename);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="panel quotes-panel">
      <h2 className="panel-title">Historial de reportes</h2>
      <p className="muted panel-desc">Archivos TXT generados y guardados localmente.</p>

      <div className="quotes-filters-bar">
        <label className="quotes-filter-field">
          <span className="quotes-filter-label">Formato</span>
          <select className="quotes-filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="607">607 — Ventas</option>
            <option value="608">608 — Anulados</option>
            <option value="606">606 — Compras</option>
          </select>
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Formato</th>
                <th>Período</th>
                <th>Registros</th>
                <th>Archivo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Aún no hay reportes generados.
                  </td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.generated_at?.replace('T', ' ').slice(0, 16)}</td>
                  <td>{TYPE_LABELS[r.report_type] || r.report_type}</td>
                  <td>{r.period}</td>
                  <td>{r.record_count}</td>
                  <td>
                    <code>{r.filename}</code>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => handleDownload(r.id, r.filename)}
                    >
                      Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
