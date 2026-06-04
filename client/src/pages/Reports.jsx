import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import ReportTooltip from '../components/reports/ReportTooltip';
import {
  CHART_COLORS,
  CHART_AXIS_TICK,
  computeKpis,
  estadoColor,
  filterQuotesByMonths,
  formatMonthLabel,
  groupByEstado,
  groupByMonth,
  topClientsByMonto,
} from '../utils/reportStats';
import MonthYearFilterFields from '../components/filters/MonthYearFilterFields';
import {
  getDefaultYearMonth,
  getReportFinanceRange,
  getYearOptionsFromItems,
  matchesYearMonth,
} from '../utils/dateRangeFilters';

const defaultMonthFilter = getDefaultYearMonth();

const PERIODS = [
  { value: 3, label: 'Últimos 3 meses' },
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Último año' },
  { value: 0, label: 'Todo el historial' },
];

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function formatMoneyShort(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function ChartEmpty({ message }) {
  return (
    <div className="report-chart-empty">
      <span className="report-chart-empty-icon" aria-hidden="true">
        ◌
      </span>
      <p>{message}</p>
    </div>
  );
}

export default function Reports() {
  const [quotes, setQuotes] = useState([]);
  const [finance, setFinance] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(6);
  const [yearFilter, setYearFilter] = useState(defaultMonthFilter.year);
  const [monthFilter, setMonthFilter] = useState(defaultMonthFilter.month);

  useEffect(() => {
    api.quotes
      .list()
      .then(setQuotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const range = getReportFinanceRange(months, yearFilter, monthFilter);
    if (!range.from || !range.to) {
      setFinance(null);
      setExpenseSummary(null);
      setFinanceLoading(false);
      return;
    }
    setFinanceLoading(true);
    Promise.all([
      api.expenses.incomeStatement(range),
      api.expenses.reportSummary(range),
    ])
      .then(([stmt, summary]) => {
        setFinance(stmt);
        setExpenseSummary(summary);
      })
      .catch((e) => setError(e.message))
      .finally(() => setFinanceLoading(false));
  }, [months, yearFilter, monthFilter]);

  const yearOptions = useMemo(
    () => getYearOptionsFromItems(quotes, (q) => q.fecha),
    [quotes]
  );

  const filtered = useMemo(() => {
    const byPeriod = filterQuotesByMonths(quotes, months || null);
    return byPeriod.filter((q) => matchesYearMonth(q.fecha, yearFilter, monthFilter));
  }, [quotes, months, yearFilter, monthFilter]);

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const monthly = useMemo(() => groupByMonth(filtered), [filtered]);
  const byEstado = useMemo(() => groupByEstado(filtered), [filtered]);
  const topClients = useMemo(() => topClientsByMonto(filtered), [filtered]);

  const financeMonthly = useMemo(
    () =>
      (finance?.monthlyComparison || []).map((row) => ({
        ...row,
        label: formatMonthLabel(row.month),
      })),
    [finance]
  );

  const expenseByCategory = useMemo(
    () =>
      (expenseSummary?.topCategories || []).map((c) => ({
        name: c.name,
        total: c.total,
      })),
    [expenseSummary]
  );

  const periodLabel = PERIODS.find((p) => p.value === months)?.label || '';

  return (
    <div className="page reports-page">
      <header className="page-header">
        <div>
          <h1>Reportes</h1>
          <p>Ingresos, gastos y cotizaciones en el período seleccionado</p>
        </div>
        <div className="reports-period reports-header-filters">
          <label htmlFor="report-period">
            <span className="quotes-filter-label">Ventana</span>
            <select
              id="report-period"
              className="quotes-filter-select"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <MonthYearFilterFields
            year={yearFilter}
            month={monthFilter}
            onYearChange={setYearFilter}
            onMonthChange={setMonthFilter}
            yearOptions={yearOptions}
            idPrefix="reports"
          />
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && financeLoading ? (
        <p className="muted reports-loading">Cargando reportes…</p>
      ) : (
        <>
          <section className="reports-finance-section" aria-label="Ingresos y gastos">
            <h2 className="reports-section-title">Ingresos y gastos</h2>
            <p className="muted reports-section-desc">
              Entrada por facturas emitidas y salida por gastos operativos registrados en Compras.
            </p>
            {financeLoading ? (
              <p className="muted">Cargando ingresos y gastos…</p>
            ) : finance ? (
              <>
                <div className="reports-kpi-grid reports-kpi-grid--finance">
                  <article className="report-kpi report-kpi--success">
                    <span className="report-kpi-label">Ingresos (entrada)</span>
                    <strong className="report-kpi-value">{formatMoney(finance.revenue)}</strong>
                    <span className="report-kpi-hint">
                      {finance.invoiceCount} factura(s) · base gravable
                    </span>
                  </article>
                  <article className="report-kpi report-kpi--danger">
                    <span className="report-kpi-label">Gastos (salida)</span>
                    <strong className="report-kpi-value">{formatMoney(finance.expenses)}</strong>
                    <span className="report-kpi-hint">
                      {finance.expenseCount} gasto(s) operativos
                    </span>
                  </article>
                  <article
                    className={`report-kpi ${
                      finance.operatingProfit >= 0 ? 'report-kpi--success' : 'report-kpi--danger'
                    }`}
                  >
                    <span className="report-kpi-label">Utilidad operativa</span>
                    <strong className="report-kpi-value">{formatMoney(finance.operatingProfit)}</strong>
                    <span className="report-kpi-hint">
                      Ingresos − costo productos − gastos
                    </span>
                  </article>
                </div>

                <div className="reports-charts-grid reports-charts-grid--finance">
                  <section className="panel report-chart-panel report-chart-panel--wide">
                    <header className="report-chart-header">
                      <div>
                        <h3>Ingresos vs gastos</h3>
                        <p className="muted">Comparación mensual</p>
                      </div>
                    </header>
                    {financeMonthly.length === 0 ? (
                      <ChartEmpty message="Sin facturas ni gastos en este período" />
                    ) : (
                      <div className="report-chart-body">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={financeMonthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={CHART_COLORS.grid}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={CHART_AXIS_TICK}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tickFormatter={formatMoneyShort}
                              tick={CHART_AXIS_TICK}
                              axisLine={false}
                              tickLine={false}
                              width={52}
                            />
                            <Tooltip
                              content={(props) => (
                                <ReportTooltip {...props} formatter={(v) => formatMoney(v)} />
                              )}
                            />
                            <Legend
                              formatter={(value) => (
                                <span className="report-legend-text">{value}</span>
                              )}
                            />
                            <Bar
                              dataKey="revenue"
                              name="Ingresos"
                              fill={CHART_COLORS.success}
                              radius={[6, 6, 0, 0]}
                              maxBarSize={40}
                            />
                            <Bar
                              dataKey="expenses"
                              name="Gastos"
                              fill={CHART_COLORS.danger}
                              radius={[6, 6, 0, 0]}
                              maxBarSize={40}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </section>

                  {expenseByCategory.length > 0 && (
                    <section className="panel report-chart-panel">
                      <header className="report-chart-header">
                        <div>
                          <h3>Gastos por categoría</h3>
                          <p className="muted">Top categorías del período</p>
                        </div>
                      </header>
                      <div className="report-chart-body">
                        <ResponsiveContainer
                          width="100%"
                          height={Math.max(200, expenseByCategory.length * 40)}
                        >
                          <BarChart
                            data={expenseByCategory}
                            layout="vertical"
                            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={CHART_COLORS.grid}
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              tickFormatter={formatMoneyShort}
                              tick={CHART_AXIS_TICK}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={110}
                              tick={{ fill: '#e8edf4', fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              content={(props) => (
                                <ReportTooltip {...props} formatter={(v) => formatMoney(v)} />
                              )}
                            />
                            <Bar
                              dataKey="total"
                              name="Gasto"
                              fill={CHART_COLORS.danger}
                              radius={[0, 6, 6, 0]}
                              maxBarSize={28}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  )}
                </div>
              </>
            ) : (
              <p className="muted">No hay datos de ingresos o gastos para el período.</p>
            )}
          </section>

          <h2 className="reports-section-title">Cotizaciones</h2>

          <section className="reports-kpi-grid" aria-label="Indicadores de cotizaciones">
            <article className="report-kpi report-kpi--primary">
              <span className="report-kpi-label">Total cotizado</span>
              <strong className="report-kpi-value">{formatMoney(kpis.totalMonto)}</strong>
              <span className="report-kpi-hint">{periodLabel}</span>
            </article>
            <article className="report-kpi">
              <span className="report-kpi-label">Cotizaciones</span>
              <strong className="report-kpi-value">{kpis.count}</strong>
              <span className="report-kpi-hint">en el período</span>
            </article>
            <article className="report-kpi">
              <span className="report-kpi-label">Promedio</span>
              <strong className="report-kpi-value">{formatMoney(kpis.promedio)}</strong>
              <span className="report-kpi-hint">por cotización</span>
            </article>
            <article className="report-kpi report-kpi--success">
              <span className="report-kpi-label">Cobrado</span>
              <strong className="report-kpi-value">{formatMoney(kpis.pagadasMonto)}</strong>
              <span className="report-kpi-hint">
                {kpis.pagadasCount} pagadas · {kpis.tasaCierre}% del total
              </span>
            </article>
            <article className="report-kpi report-kpi--primary">
              <span className="report-kpi-label">Por cobrar</span>
              <strong className="report-kpi-value">{formatMoney(kpis.pendienteCobro)}</strong>
              <span className="report-kpi-hint">balance pendiente</span>
            </article>
            <article className="report-kpi">
              <span className="report-kpi-label">Clientes activos</span>
              <strong className="report-kpi-value">{kpis.clientesUnicos}</strong>
              <span className="report-kpi-hint">con cotizaciones</span>
            </article>
          </section>

          {filtered.length === 0 ? (
            <section className="panel reports-empty-panel">
              <p className="muted">No hay cotizaciones en este período.</p>
              <p className="muted">Crea cotizaciones para ver gráficos y tendencias aquí.</p>
            </section>
          ) : (
            <div className="reports-charts-grid" aria-label="Gráficos de cotizaciones">
              <section className="panel report-chart-panel report-chart-panel--wide">
                <header className="report-chart-header">
                  <div>
                    <h2>Evolución del monto</h2>
                    <p className="muted">Total cotizado por mes</p>
                  </div>
                </header>
                {monthly.length === 0 ? (
                  <ChartEmpty message="Sin datos por mes" />
                ) : (
                  <div className="report-chart-body">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="montoGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={CHART_AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={formatMoneyShort}
                          tick={CHART_AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                        />
                        <Tooltip
                          content={(props) => (
                            <ReportTooltip {...props} formatter={(v) => formatMoney(v)} />
                          )}
                        />
                        <Area
                          type="monotone"
                          dataKey="monto"
                          name="Monto"
                          stroke={CHART_COLORS.primary}
                          strokeWidth={2.5}
                          fill="url(#montoGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="panel report-chart-panel">
                <header className="report-chart-header">
                  <div>
                    <h2>Por estado</h2>
                    <p className="muted">Distribución de cotizaciones</p>
                  </div>
                </header>
                {byEstado.length === 0 ? (
                  <ChartEmpty message="Sin datos" />
                ) : (
                  <div className="report-chart-body report-chart-body--pie">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={byEstado}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {byEstado.map((entry) => (
                            <Cell key={entry.estado} fill={estadoColor(entry.estado)} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={(props) => (
                            <ReportTooltip
                              {...props}
                              formatter={(v, entry) =>
                                `${v} · ${formatMoney(entry?.payload?.monto)}`
                              }
                            />
                          )}
                        />
                        <Legend
                          verticalAlign="bottom"
                          formatter={(value) => (
                            <span className="report-legend-text">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="panel report-chart-panel">
                <header className="report-chart-header">
                  <div>
                    <h2>Actividad mensual</h2>
                    <p className="muted">Cantidad de cotizaciones</p>
                  </div>
                </header>
                {monthly.length === 0 ? (
                  <ChartEmpty message="Sin datos" />
                ) : (
                  <div className="report-chart-body">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={CHART_AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={CHART_AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                          width={32}
                        />
                        <Tooltip content={(props) => <ReportTooltip {...props} />} />
                        <Bar
                          dataKey="cantidad"
                          name="Cotizaciones"
                          fill={CHART_COLORS.secondary}
                          radius={[6, 6, 0, 0]}
                          maxBarSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="panel report-chart-panel report-chart-panel--wide">
                <header className="report-chart-header">
                  <div>
                    <h2>Top clientes</h2>
                    <p className="muted">Por monto total cotizado</p>
                  </div>
                </header>
                {topClients.length === 0 ? (
                  <ChartEmpty message="Sin clientes en el período" />
                ) : (
                  <div className="report-chart-body">
                    <ResponsiveContainer width="100%" height={Math.max(220, topClients.length * 44)}>
                      <BarChart
                        data={topClients}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={formatMoneyShort}
                          tick={CHART_AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="shortName"
                          width={120}
                          tick={{ fill: '#e8edf4', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={(props) => (
                            <ReportTooltip {...props} formatter={(v) => formatMoney(v)} />
                          )}
                        />
                        <Bar
                          dataKey="monto"
                          name="Monto"
                          fill={CHART_COLORS.success}
                          radius={[0, 6, 6, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="panel report-estado-table">
                <h2>Detalle por estado</h2>
                <table className="data-table reports-summary-table">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th className="col-num">Cantidad</th>
                      <th className="col-num">Monto</th>
                      <th className="col-num">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEstado.map((row) => (
                      <tr key={row.estado}>
                        <td>
                          <span
                            className="report-estado-dot"
                            style={{ background: estadoColor(row.estado) }}
                          />
                          <span className={`badge badge-${row.estado}`}>{row.label}</span>
                        </td>
                        <td className="col-num">{row.value}</td>
                        <td className="col-num">{formatMoney(row.monto)}</td>
                        <td className="col-num">
                          {kpis.count > 0 ? Math.round((row.value / kpis.count) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
