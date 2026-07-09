import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  FileWarning,
  Users,
  CheckCircle2,
  GitCompare,
  Wallet,
} from 'lucide-react';
import { formatMoney, formatMoneyCompact } from '../../../utils/formatMoney';

const ICONS = {
  sales: DollarSign,
  pending: FileWarning,
  clients: Users,
  approved: CheckCircle2,
  conversion: GitCompare,
  cashflow: Wallet,
};

function GrowthBadge({ changePct }) {
  const n = Number(changePct) || 0;
  if (n > 0) {
    return (
      <span className="erp-growth erp-growth-up">
        <TrendingUp size={14} aria-hidden /> +{n}%
      </span>
    );
  }
  if (n < 0) {
    return (
      <span className="erp-growth erp-growth-down">
        <TrendingDown size={14} aria-hidden /> {n}%
      </span>
    );
  }
  return (
    <span className="erp-growth erp-growth-neutral">
      <Minus size={14} aria-hidden /> 0%
    </span>
  );
}

function KpiCard({ id, label, value, changePct, subtitle, format = 'money' }) {
  const Icon = ICONS[id] || DollarSign;
  const display =
    format === 'percent'
      ? `${value}%`
      : format === 'number'
        ? value
        : formatMoneyCompact(value);

  return (
    <motion.article
      className="erp-kpi-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <div className="erp-kpi-card-top">
        <span className="erp-kpi-icon" aria-hidden>
          <Icon size={20} />
        </span>
        {changePct != null && <GrowthBadge changePct={changePct} />}
      </div>
      <p className="erp-kpi-value" title={format === 'money' ? formatMoney(value) : undefined}>
        {display}
      </p>
      <p className="erp-kpi-label">{label}</p>
      {subtitle && <p className="erp-kpi-sub">{subtitle}</p>}
    </motion.article>
  );
}

export default function ExecutiveKpiCards({ kpis }) {
  if (!kpis) return null;

  return (
    <section className="erp-kpi-grid" aria-label="Indicadores ejecutivos">
      <KpiCard
        id="sales"
        label="Ventas del mes"
        value={kpis.salesMonth.value}
        changePct={kpis.salesMonth.changePct}
      />
      <KpiCard
        id="pending"
        label="Facturas pendientes"
        value={kpis.pendingInvoices.value}
        changePct={kpis.pendingInvoices.changePct}
        subtitle={formatMoneyCompact(kpis.pendingInvoicesBalance) + ' por cobrar'}
        format="number"
      />
      <KpiCard
        id="clients"
        label="Clientes activos"
        value={kpis.activeClients.value}
        changePct={kpis.activeClients.changePct}
        format="number"
      />
      <KpiCard
        id="approved"
        label="Cotizaciones aprobadas"
        value={kpis.approvedQuotes.value}
        changePct={kpis.approvedQuotes.changePct}
        format="number"
      />
      <KpiCard
        id="conversion"
        label="Conversión cotización → factura"
        value={kpis.conversionRate.value}
        changePct={kpis.conversionRate.changePct}
        format="percent"
      />
      <KpiCard
        id="cashflow"
        label="Flujo de caja proyectado"
        value={kpis.cashFlowProjected.value}
        subtitle={`Entradas ${formatMoneyCompact(kpis.cashFlowProjected.inflow)} · Salidas ${formatMoneyCompact(kpis.cashFlowProjected.outflow)}`}
      />
    </section>
  );
}
