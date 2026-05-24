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
  computeKpis,
  estadoColor,
  filterQuotesByMonths,
  groupByEstado,
  groupByMonth,
  topClientsByMonto,
} from '../utils/reportStats';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [months, setMonths] = useState(6);

  useEffect(() => {
    api.quotes
      .list()
      .then(setQuotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => filterQuotesByMonths(quotes, months || null),
    [quotes, months]
  );

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const monthly = useMemo(() => groupByMonth(filtered), [filtered]);
  const byEstado = useMemo(() => groupByEstado(filtered), [filtered]);
  const topClients = useMemo(() => topClientsByMonto(filtered), [filtered]);

  const periodLabel = PERIODS.find((p) => p.value === months)?.label || '';

  return (
    <div className="page reports-page">
      <header className="page-header">
        <div>
          <h1>Reportes</h1>
          <p>Resumen visual de tus cotizaciones y ventas</p>
        </div>
        <div className="reports-period">
          <label htmlFor="report-period">Período</label>
          <select
            id="report-period"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="muted reports-loading">Cargando reportes…</p>
      ) : (
        <>
          <section className="reports-kpi-grid" aria-label="Indicadores principales">
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
              <span className="report-kpi-label">Aceptadas</span>
              <strong className="report-kpi-value">{formatMoney(kpis.aceptadasMonto)}</strong>
              <span className="report-kpi-hint">
                {kpis.aceptadasCount} cotiz. · {kpis.tasaCierre}% cierre
              </span>
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
            <div className="reports-charts-grid">
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
                          tick={{ fill: '#8b9cb3', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={formatMoneyShort}
                          tick={{ fill: '#8b9cb3', fontSize: 12 }}
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
                          tick={{ fill: '#8b9cb3', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: '#8b9cb3', fontSize: 12 }}
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
                          tick={{ fill: '#8b9cb3', fontSize: 12 }}
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
