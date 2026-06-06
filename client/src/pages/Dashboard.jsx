import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import { useLicense } from '../context/LicenseContext';
import { formatMoney, formatMoneyCompact } from '../utils/formatMoney';
import ReportTooltip from '../components/reports/ReportTooltip';
import { CHART_AXIS_TICK, CHART_COLORS } from '../utils/reportStats';

const ACTION_CARDS = [
  {
    module: 'cotizaciones',
    to: '/cotizaciones/nueva',
    title: 'Nueva cotización',
    text: 'Crea una cotización con datos del cliente e ítems.',
  },
  {
    module: 'cotizaciones',
    to: '/cotizaciones',
    title: 'Ver cotizaciones',
    text: 'Consulta y administra todas tus cotizaciones.',
  },
  {
    module: 'facturas',
    to: '/facturas',
    title: 'Facturas',
    text: 'Emite y administra facturas fiscales.',
  },
  {
    module: 'compras',
    to: '/compras/gastos',
    title: 'Gastos',
    text: 'Registra y vincula gastos a cotizaciones y facturas.',
  },
  {
    module: 'compras',
    to: '/compras/resultados',
    title: 'Estado de resultados',
    text: 'Ingresos, costos y utilidad operativa.',
  },
  {
    module: 'plantillas',
    to: '/plantillas',
    title: 'Diseñador de plantillas',
    text: 'Diseña el PDF de tus cotizaciones con arrastrar y soltar.',
  },
  {
    module: 'reportes',
    to: '/reportes',
    title: 'Reportes',
    text: 'Gráficos de ventas, estados y clientes principales.',
  },
];

export default function Dashboard() {
  const { hasModule, license } = useLicense();
  const licensedModules = license?.modules ?? [];
  const [emisor, setEmisor] = useState(null);
  const [stats, setStats] = useState({ quotes: 0 });
  const [finance, setFinance] = useState(null);
  const emisorConfigured = emisor?.nombre?.trim();

  useEffect(() => {
    api.emisor.get().then(setEmisor).catch(console.error);
    if (hasModule('cotizaciones')) {
      api.quotes
        .list()
        .then((quotes) => setStats({ quotes: quotes.length }))
        .catch(console.error);
    }
    if (hasModule('compras') || hasModule('reportes')) {
      api.expenses
        .dashboard()
        .then(setFinance)
        .catch(() => setFinance(null));
    }
  }, [licensedModules.join('|')]);

  const chartData = finance
    ? [
        { name: 'Ingresos', value: finance.expensesVsRevenue?.revenue || 0 },
        { name: 'Gastos', value: finance.expensesVsRevenue?.expenses || 0 },
      ]
    : [];

  const moneyTitle = (n) => formatMoney(n);

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Inicio</h1>
          <p>Gestiona cotizaciones con los datos del cliente en cada una</p>
        </div>
        {hasModule('cotizaciones') && (
          <Link to="/cotizaciones/nueva" className="btn-primary">
            + Nueva cotización
          </Link>
        )}
      </header>

      <div className="stats-grid">
        {hasModule('cotizaciones') && (
          <div className="stat-card">
            <span className="stat-value">{stats.quotes}</span>
            <span className="stat-label">Cotizaciones</span>
          </div>
        )}
        {finance && (hasModule('compras') || hasModule('reportes')) && (
          <>
            <div className="stat-card">
              <span className="stat-value" title={moneyTitle(finance.expensesMonth)}>
                {formatMoneyCompact(finance.expensesMonth)}
              </span>
              <span className="stat-label">Gastos del mes</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" title={moneyTitle(finance.expensesYear)}>
                {formatMoneyCompact(finance.expensesYear)}
              </span>
              <span className="stat-label">Gastos del año</span>
            </div>
            <div className="stat-card">
              <span
                className={`stat-value ${finance.netProfitMonth >= 0 ? 'profit-positive' : 'profit-negative'}`}
                title={moneyTitle(finance.netProfitMonth)}
              >
                {formatMoneyCompact(finance.netProfitMonth)}
              </span>
              <span className="stat-label">Utilidad operativa (mes)</span>
            </div>
          </>
        )}
      </div>

      {finance?.topCategories?.length > 0 && (hasModule('compras') || hasModule('reportes')) && (
        <section className="panel report-chart-panel">
          <h2 className="panel-title">Top categorías de gasto (mes)</h2>
          <div className="chart-responsive-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={finance.topCategories.map((c) => ({
                name: c.name,
                total: c.total,
              }))}
            >
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
              <YAxis
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => formatMoneyCompact(v)}
              />
              <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
              <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </section>
      )}

      {chartData.some((d) => d.value > 0) && (hasModule('compras') || hasModule('reportes')) && (
        <section className="panel report-chart-panel">
          <h2 className="panel-title">Ingresos vs gastos (mes)</h2>
          <div className="chart-responsive-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => formatMoneyCompact(v)}
              />
              <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
              <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="cards-row">
        {ACTION_CARDS.filter((card) => hasModule(card.module)).map((card) => (
          <Link key={card.to} to={card.to} className="action-card">
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </Link>
        ))}
      </div>

      {!emisorConfigured && (
        <div className="alert alert-warn">
          Configura los datos de tu empresa en{' '}
          <Link to="/configuracion">Empresa</Link> para que aparezcan en las cotizaciones.
        </div>
      )}

      {emisorConfigured && (
        <section className="panel emisor-panel">
          <div className="panel-header-row">
            <h2>Mi empresa</h2>
            <Link to="/configuracion" className="btn-ghost btn-sm">
              Editar
            </Link>
          </div>
          <dl className="emisor-dl">
            <div>
              <dt>Empresa</dt>
              <dd className="text-break">{emisor.nombre}</dd>
            </div>
            <div>
              <dt>RNC</dt>
              <dd className="text-break">{emisor.rnc}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd className="text-break">{emisor.direccion}</dd>
            </div>
            <div>
              <dt>Tel.</dt>
              <dd className="text-break">{emisor.telefono}</dd>
            </div>
            <div className="emisor-dl-email">
              <dt>Email</dt>
              <dd className="text-break">
                <a href={`mailto:${emisor.email}`}>{emisor.email}</a>
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
