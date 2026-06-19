import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api';
import { formatMoney } from '../../utils/formatMoney';
import ReportTooltip from '../../components/reports/ReportTooltip';
import { CHART_AXIS_TICK, CHART_COLORS } from '../../utils/reportStats';
import MonthYearFilterFields from '../../components/filters/MonthYearFilterFields';
import { dateRangeFromYearMonth, getDefaultYearMonth } from '../../utils/dateRangeFilters';
import LoadingOverlay from '../../components/LoadingOverlay';

const defaultPeriod = getDefaultYearMonth();

export default function ExpenseReportPage() {
  const [yearFilter, setYearFilter] = useState(defaultPeriod.year);
  const [monthFilter, setMonthFilter] = useState(defaultPeriod.month);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ category_id: '', client_id: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.expenses.categories().then(setCategories).catch(() => {});
    api.clients.list().then(setClients).catch(() => {});
  }, []);

  const loadReport = () => {
    setLoading(true);
    setError('');
    const range = dateRangeFromYearMonth(yearFilter, monthFilter);
    const params = { ...range, ...filters };
    if (!params.from) delete params.from;
    if (!params.to) delete params.to;
    if (!params.category_id) delete params.category_id;
    if (!params.client_id) delete params.client_id;
    api.expenses
      .reportSummary(params)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, []);

  const chartData =
    report?.topCategories?.map((c) => ({
      name: c.name.length > 14 ? `${c.name.slice(0, 14)}…` : c.name,
      total: c.total,
    })) || [];

  const handleExport = (format) => {
    const range = dateRangeFromYearMonth(yearFilter, monthFilter);
    api.expenses.exportReport({ ...range, ...filters, format });
  };

  return (
    <>
      <LoadingOverlay show={loading} fixed message="Cargando reporte…" />
      <section className="panel">
        <h2 className="panel-title">Reporte de gastos</h2>
        <div className="quotes-filters-bar" role="group" aria-label="Filtros del reporte">
          <MonthYearFilterFields
            year={yearFilter}
            month={monthFilter}
            onYearChange={setYearFilter}
            onMonthChange={setMonthFilter}
            idPrefix="expense-report"
          />
          <label className="quotes-filter-field">
            <span className="quotes-filter-label">Categoría</span>
            <select
              className="quotes-filter-select"
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="quotes-filter-field">
            <span className="quotes-filter-label">Cliente</span>
            <select
              className="quotes-filter-select"
              value={filters.client_id}
              onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
            >
              <option value="">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn-primary btn-sm" onClick={loadReport} disabled={loading}>
            Actualizar
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => handleExport('csv')}>
            Exportar CSV
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => handleExport('pdf')}>
            Exportar HTML/PDF
          </button>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {report && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{formatMoney(report.total)}</span>
              <span className="stat-label">Total gastos</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{report.count}</span>
              <span className="stat-label">Cantidad</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatMoney(report.average)}</span>
              <span className="stat-label">Promedio</span>
            </div>
          </div>

          {chartData.length > 0 && (
            <section className="panel report-chart-panel">
              <h3 className="panel-subtitle">Top categorías</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={CHART_AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
                  <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </>
      )}
    </>
  );
}
