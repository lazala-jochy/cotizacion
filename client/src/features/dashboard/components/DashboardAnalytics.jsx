import { motion } from 'framer-motion';
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
import ReportTooltip from '../../../components/reports/ReportTooltip';
import { CHART_AXIS_TICK, CHART_COLORS } from '../../../utils/reportStats';
import { formatMoney, formatMoneyCompact } from '../../../utils/formatMoney';

function ChartPanel({ title, children, delay = 0 }) {
  return (
    <motion.section
      className="erp-panel erp-chart-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <h2 className="erp-panel-title">{title}</h2>
      <div className="erp-chart-wrap">{children}</div>
    </motion.section>
  );
}

export default function DashboardAnalytics({ analytics }) {
  if (!analytics) return null;

  const pieColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const collectionData = [
    { name: 'Cobradas', value: analytics.invoicesCollection.collected, count: analytics.invoicesCollection.collectedCount },
    { name: 'Pendientes', value: analytics.invoicesCollection.pending, count: analytics.invoicesCollection.pendingCount },
  ];

  return (
    <div className="erp-charts-grid">
      <ChartPanel title="Ventas — últimos 12 meses" delay={0.05}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={analytics.salesByMonth}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={formatMoneyCompact} />
            <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
            <Area type="monotone" dataKey="revenue" stroke="var(--accent)" fill="url(#salesGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Utilidad mensual" delay={0.1}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={analytics.profitByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={formatMoneyCompact} />
            <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
            <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Gastos por categoría (mes)" delay={0.15}>
        {analytics.expensesByCategory.length === 0 ? (
          <p className="erp-empty-chart">Sin gastos registrados este mes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analytics.expensesByCategory}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
              >
                {analytics.expensesByCategory.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Facturas cobradas vs pendientes" delay={0.2}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={collectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={formatMoneyCompact} />
            <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <Cell fill="#22c55e" />
              <Cell fill="#f59e0b" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
