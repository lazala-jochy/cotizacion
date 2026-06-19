import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import MonthYearFilterFields from '../../components/filters/MonthYearFilterFields';
import { getDefaultYearMonth, getYearOptionsFromItems, matchesDgiiPeriod } from '../../utils/dateRangeFilters';
import { SectionLoader } from '../../components/loading';

const defaultMonthFilter = getDefaultYearMonth();

const TYPE_LABELS = {
  '606': '606',
  '607': '607',
  '608': '608',
};

export default function DgiiReportsHistory() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(defaultMonthFilter.year);
  const [monthFilter, setMonthFilter] = useState(defaultMonthFilter.month);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const yearOptions = useMemo(
    () =>
      getYearOptionsFromItems(reports, (r) => {
        const p = String(r.period || '');
        return p.length >= 6 ? `${p.slice(0, 4)}-${p.slice(4, 6)}-01` : r.generated_at;
      }),
    [reports]
  );

  const visibleReports = useMemo(
    () => reports.filter((r) => matchesDgiiPeriod(r.period, yearFilter, monthFilter)),
    [reports, yearFilter, monthFilter]
  );

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

      <div className="quotes-filters-bar" role="group" aria-label="Filtros del historial">
        <MonthYearFilterFields
          year={yearFilter}
          month={monthFilter}
          onYearChange={setYearFilter}
          onMonthChange={setMonthFilter}
          yearOptions={yearOptions}
          idPrefix="dgii-history"
        />
        <label className="quotes-filter-field">
          <span className="quotes-filter-label">Formato</span>
          <select className="quotes-filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="606">606</option>
            <option value="607">607</option>
            <option value="608">608</option>
          </select>
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <SectionLoader message="Cargando historial…" />}

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
              {visibleReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {reports.length === 0
                      ? 'Aún no hay reportes generados.'
                      : 'No hay reportes con estos filtros.'}
                  </td>
                </tr>
              )}
              {visibleReports.map((r) => (
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
