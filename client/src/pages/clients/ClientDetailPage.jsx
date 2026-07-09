import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dashboardApi } from '../../features/dashboard/services/dashboardApi';
import { formatMoney } from '../../utils/formatMoney';
import DashboardSkeleton from '../../features/dashboard/components/DashboardSkeleton';

export default function ClientDetailPage() {
  const { id: clientId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .clientCrm(clientId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  const { client, summary, invoices, quotes } = data;

  return (
    <div className="page erp-dashboard">
      <header className="erp-page-header">
        <Link to="/clientes" className="btn-ghost btn-sm">
          <ArrowLeft size={16} /> Volver
        </Link>
        <div>
          <h1>
            <User size={22} aria-hidden /> {client.nombre}
          </h1>
          <p>{summary.statusLabel} · {client.email || client.telefono || 'Sin contacto'}</p>
        </div>
      </header>

      <div className="erp-kpi-grid erp-kpi-grid-compact">
        <article className="erp-kpi-card">
          <p className="erp-kpi-value">{formatMoney(summary.totalPurchased)}</p>
          <p className="erp-kpi-label">Total comprado</p>
        </article>
        <article className="erp-kpi-card">
          <p className="erp-kpi-value">{summary.lastPurchase || '—'}</p>
          <p className="erp-kpi-label">Última compra</p>
        </article>
        <article className="erp-kpi-card">
          <p className="erp-kpi-value">{summary.pendingInvoices}</p>
          <p className="erp-kpi-label">Facturas pendientes</p>
        </article>
        <article className="erp-kpi-card">
          <p className="erp-kpi-value">{summary.quoteCount}</p>
          <p className="erp-kpi-label">Cotizaciones</p>
        </article>
      </div>

      <div className="erp-detail-grid">
        <section className="erp-panel">
          <h2>Historial de facturas</h2>
          <ul className="erp-timeline">
            {invoices.slice(0, 10).map((inv) => (
              <li key={inv.id}>
                <Link to={`/facturas/${inv.id}`}>
                  {inv.fiscal_number || inv.numero} · {formatMoney(inv.total)} · {inv.estado}
                </Link>
              </li>
            ))}
            {invoices.length === 0 && <li className="erp-muted">Sin facturas.</li>}
          </ul>
        </section>

        <section className="erp-panel">
          <h2>Historial de cotizaciones</h2>
          <ul className="erp-timeline">
            {quotes.slice(0, 10).map((q) => (
              <li key={q.id}>
                <Link to={`/cotizaciones/${q.id}`}>
                  {q.numero} · {formatMoney(q.total)} · {q.estado}
                </Link>
              </li>
            ))}
            {quotes.length === 0 && <li className="erp-muted">Sin cotizaciones.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
