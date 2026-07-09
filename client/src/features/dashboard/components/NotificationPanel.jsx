import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Bell, FileWarning, Clock, Activity } from 'lucide-react';
import { formatMoneyCompact } from '../../../utils/formatMoney';

function Section({ title, icon: Icon, children, empty }) {
  if (empty) return null;
  return (
    <div className="erp-notif-section">
      <h3>
        <Icon size={16} aria-hidden /> {title}
      </h3>
      <ul>{children}</ul>
    </div>
  );
}

export default function NotificationPanel({ open, onClose, data }) {
  const counts = data?.counts;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="erp-notif-backdrop"
            aria-label="Cerrar notificaciones"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="erp-notif-panel"
            role="dialog"
            aria-label="Centro de notificaciones"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <header className="erp-notif-header">
              <div>
                <Bell size={20} aria-hidden />
                <h2>Notificaciones</h2>
                {counts?.total > 0 && <span className="erp-badge">{counts.total}</span>}
              </div>
              <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className="erp-notif-body">
              <Section
                title="Facturas vencidas"
                icon={FileWarning}
                empty={!data?.overdueInvoices?.length}
              >
                {data?.overdueInvoices?.map((inv) => (
                  <li key={inv.id}>
                    <Link to={`/facturas/${inv.id}`} onClick={onClose}>
                      <strong>{inv.fiscal_number || inv.numero}</strong>
                      <span>{inv.client_nombre}</span>
                      <span className="erp-notif-meta">
                        {formatMoneyCompact(inv.total)} · vence {inv.fecha_vencimiento}
                      </span>
                    </Link>
                  </li>
                ))}
              </Section>

              <Section
                title="Cotizaciones pendientes"
                icon={Clock}
                empty={!data?.pendingQuotes?.length}
              >
                {data?.pendingQuotes?.map((q) => (
                  <li key={q.id}>
                    <Link to={`/cotizaciones/${q.id}`} onClick={onClose}>
                      <strong>{q.numero}</strong>
                      <span>{q.client_nombre}</span>
                      <span className="erp-notif-meta">{q.estado}</span>
                    </Link>
                  </li>
                ))}
              </Section>

              <Section
                title="Seguimiento recomendado"
                icon={Clock}
                empty={!data?.followUpReminders?.length}
              >
                {data?.followUpReminders?.map((q) => (
                  <li key={q.id}>
                    <Link to={`/cotizaciones/${q.id}`} onClick={onClose}>
                      <strong>{q.numero}</strong>
                      <span>Sin respuesta · {q.client_nombre}</span>
                    </Link>
                  </li>
                ))}
              </Section>

              <Section title="Actividad reciente" icon={Activity} empty={!data?.recentActivity?.length}>
                {data?.recentActivity?.map((a, i) => (
                  <li key={`${a.type}-${a.id}-${i}`}>
                    <Link
                      to={a.type === 'invoice' ? `/facturas/${a.id}` : `/cotizaciones/${a.id}`}
                      onClick={onClose}
                    >
                      <strong>{a.type === 'invoice' ? 'Factura' : 'Cotización'} {a.ref}</strong>
                      <span>{a.client_nombre}</span>
                      <span className="erp-notif-meta">{a.estado}</span>
                    </Link>
                  </li>
                ))}
              </Section>

              {!data?.overdueInvoices?.length &&
                !data?.pendingQuotes?.length &&
                !data?.followUpReminders?.length &&
                !data?.recentActivity?.length && (
                  <p className="erp-muted erp-notif-empty">Todo al día. No hay alertas pendientes.</p>
                )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Botón de campana para el layout. */
export function NotificationBell({ count, onClick }) {
  return (
    <button type="button" className="erp-notif-bell" onClick={onClick} aria-label="Abrir notificaciones">
      <Bell size={20} />
      {count > 0 && <span className="erp-notif-bell-badge">{count > 99 ? '99+' : count}</span>}
    </button>
  );
}
