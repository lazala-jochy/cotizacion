import { formatMoney, formatPercent } from '../../utils/formatMoney';

export default function ProfitabilityPanel({ profitability, title = 'Rentabilidad' }) {
  if (!profitability) return null;
  const p = profitability;
  const marginClass =
    p.marginPercent >= 20 ? 'profit-positive' : p.marginPercent >= 0 ? 'profit-neutral' : 'profit-negative';

  return (
    <section className="panel profitability-panel">
      <h2 className="panel-title">{title}</h2>
      <dl className="profitability-grid">
        <div>
          <dt>Subtotal venta</dt>
          <dd>{formatMoney(p.subtotal)}</dd>
        </div>
        <div>
          <dt>Descuento</dt>
          <dd>{formatMoney(p.descuento)}</dd>
        </div>
        <div>
          <dt>Ingreso (base)</dt>
          <dd>{formatMoney(p.revenue)}</dd>
        </div>
        <div>
          <dt>ITBIS</dt>
          <dd>{formatMoney(p.itbis)}</dd>
        </div>
        <div>
          <dt>Total con ITBIS</dt>
          <dd>{formatMoney(p.total)}</dd>
        </div>
        <div>
          <dt>Costo productos</dt>
          <dd>{formatMoney(p.productCost)}</dd>
        </div>
        <div>
          <dt>Gastos asociados</dt>
          <dd>{formatMoney(p.expensesTotal)}</dd>
        </div>
        <div>
          <dt>Utilidad bruta</dt>
          <dd>{formatMoney(p.grossProfit)}</dd>
        </div>
        <div className="profitability-highlight">
          <dt>Utilidad neta</dt>
          <dd className={marginClass}>{formatMoney(p.netProfit)}</dd>
        </div>
        <div className="profitability-highlight">
          <dt>Margen</dt>
          <dd className={marginClass}>{formatPercent(p.marginPercent)}</dd>
        </div>
      </dl>
    </section>
  );
}
