import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

const defaultPeriod = getDefaultYearMonth();

export default function IncomeStatementPage() {
  const [yearFilter, setYearFilter] = useState(defaultPeriod.year);
  const [monthFilter, setMonthFilter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    const range = dateRangeFromYearMonth(yearFilter, monthFilter);
    api.expenses
      .incomeStatement(range)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <section className="panel">
        <h2 className="panel-title">Estado de resultados</h2>
        <p className="muted panel-desc">
          Ingresos por facturas emitidas menos costo de productos y gastos operativos del período.
        </p>
        <div className="quotes-filters-bar" role="group" aria-label="Período del estado de resultados">
          <MonthYearFilterFields
            year={yearFilter}
            month={monthFilter}
            onYearChange={setYearFilter}
            onMonthChange={setMonthFilter}
            idPrefix="income-statement"
          />
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={load} disabled={loading}>
          {loading ? 'Calculando…' : 'Generar'}
        </button>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          <section className="panel income-statement-panel">
            <dl className="income-statement-dl">
              <div className="income-line">
                <dt>Ingresos (base gravable)</dt>
                <dd>{formatMoney(data.revenue)}</dd>
              </div>
              <div className="income-line income-line--deduct">
                <dt>(−) Costo de productos</dt>
                <dd>{formatMoney(data.productCost)}</dd>
              </div>
              <div className="income-line income-line--deduct">
                <dt>(−) Gastos operativos</dt>
                <dd>{formatMoney(data.expenses)}</dd>
              </div>
              <div className="income-line income-line--total">
                <dt>= Utilidad operativa</dt>
                <dd className={data.operatingProfit >= 0 ? 'profit-positive' : 'profit-negative'}>
                  {formatMoney(data.operatingProfit)}
                </dd>
              </div>
            </dl>
            <p className="muted">
              {data.invoiceCount} facturas · {data.expenseCount} gastos en el período
            </p>
          </section>

          {data.monthlyComparison?.length > 0 && (
            <section className="panel report-chart-panel">
              <h3 className="panel-subtitle">Comparación mensual</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ReportTooltip formatter={formatMoney} />} />
                  <Legend
                    formatter={(value) => (
                      <span className="report-chart-legend-text">{value}</span>
                    )}
                  />
                  <Bar dataKey="revenue" name="Ingresos" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Gastos" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </>
      )}
    </>
  );
}
