import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(n || 0);
}

export default function ChartViewer({ chartType, rows, chartKey, chartValue, chartSeries, isRanking }) {
  if (!rows?.length || chartType === 'table') return null;

  const series = chartSeries?.length ? chartSeries : [chartValue].filter(Boolean);
  const data = rows.map((r) => {
    const entry = {
      name: String(r[chartKey] ?? '—').slice(0, 28),
    };
    for (const s of series) {
      entry[s] = Number(r[s]) || 0;
    }
    entry.value = Number(r[chartValue]) || 0;
    return entry;
  });

  const layout = isRanking || chartType === 'ranking' ? 'vertical' : 'horizontal';

  if (chartType === 'pie') {
    return (
      <div className="report-builder-chart">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'line') {
    return (
      <div className="report-builder-chart">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={formatMoney} />
            <Tooltip formatter={(v) => formatMoney(v)} />
            {series.map((s, i) => (
              <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="report-builder-chart">
      <ResponsiveContainer width="100%" height={isRanking ? 320 : 280}>
        <BarChart data={data} layout={layout}>
          <CartesianGrid strokeDasharray="3 3" />
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" tickFormatter={formatMoney} />
              <YAxis type="category" dataKey="name" width={120} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatMoney} />
            </>
          )}
          <Tooltip formatter={(v) => formatMoney(v)} />
          {series.length > 1 ? (
            series.map((s, i) => (
              <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))
          ) : (
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          )}
          {series.length > 1 && <Legend />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
