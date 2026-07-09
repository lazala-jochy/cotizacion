import { motion } from 'framer-motion';
import { Zap, Mail, BellRing, MessageSquare } from 'lucide-react';

export default function AutomationsPanel({ settings, tasks, saving, onSave }) {
  if (!settings) return null;

  const toggle = (key) => {
    onSave({ ...settings, [key]: !settings[key] });
  };

  return (
    <section className="erp-panel erp-automations">
      <header className="erp-panel-header">
        <Zap size={18} aria-hidden />
        <h2>Automatizaciones</h2>
        {tasks?.length > 0 && <span className="erp-badge">{tasks.length} tareas</span>}
      </header>

      <div className="erp-auto-grid">
        <label className="erp-auto-toggle">
          <input
            type="checkbox"
            checked={settings.autoSendQuotes}
            disabled={saving}
            onChange={() => toggle('autoSendQuotes')}
          />
          <Mail size={18} aria-hidden />
          <div>
            <strong>Envío automático de cotizaciones</strong>
            <p>Enviar por email al marcar cotización como enviada.</p>
          </div>
        </label>

        <label className="erp-auto-toggle">
          <input
            type="checkbox"
            checked={settings.paymentReminders}
            disabled={saving}
            onChange={() => toggle('paymentReminders')}
          />
          <BellRing size={18} aria-hidden />
          <div>
            <strong>Recordatorios de cobro</strong>
            <p>Alertar {settings.reminderDaysBefore} días antes del vencimiento.</p>
          </div>
        </label>

        <label className="erp-auto-toggle">
          <input
            type="checkbox"
            checked={settings.quoteFollowUp}
            disabled={saving}
            onChange={() => toggle('quoteFollowUp')}
          />
          <MessageSquare size={18} aria-hidden />
          <div>
            <strong>Seguimiento de cotizaciones</strong>
            <p>Recordar cotizaciones enviadas sin respuesta tras {settings.followUpDays} días.</p>
          </div>
        </label>
      </div>

      {tasks?.length > 0 && (
        <motion.ul
          className="erp-auto-tasks"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {tasks.slice(0, 5).map((t, i) => (
            <li key={`${t.type}-${t.ref}-${i}`}>
              {t.type === 'payment_reminder' ? 'Cobro' : 'Seguimiento'} · {t.ref} — {t.client}
            </li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
