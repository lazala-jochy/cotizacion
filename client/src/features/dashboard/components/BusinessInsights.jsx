import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Lightbulb,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Info,
} from 'lucide-react';

const TYPE_META = {
  warning: { icon: AlertTriangle, className: 'erp-insight-warn' },
  danger: { icon: AlertCircle, className: 'erp-insight-danger' },
  success: { icon: TrendingUp, className: 'erp-insight-success' },
  info: { icon: Info, className: 'erp-insight-info' },
};

export default function BusinessInsights({ insights }) {
  if (!insights?.length) {
    return (
      <section className="erp-panel erp-insights">
        <header className="erp-panel-header">
          <Sparkles size={18} aria-hidden />
          <h2>Insights de negocio</h2>
        </header>
        <p className="erp-muted">Registre ventas y gastos para recibir recomendaciones automáticas.</p>
      </section>
    );
  }

  return (
    <section className="erp-panel erp-insights" aria-label="Insights de negocio">
      <header className="erp-panel-header">
        <Lightbulb size={18} aria-hidden />
        <h2>Insights de negocio</h2>
        <span className="erp-badge">{insights.length}</span>
      </header>
      <ul className="erp-insights-list">
        {insights.map((item, i) => {
          const meta = TYPE_META[item.type] || TYPE_META.info;
          const Icon = meta.icon;
          return (
            <motion.li
              key={item.id}
              className={`erp-insight-item ${meta.className}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <span className="erp-insight-icon" aria-hidden>
                <Icon size={18} />
              </span>
              <div className="erp-insight-body">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                {item.action?.path && (
                  <Link to={item.action.path} className="erp-insight-link">
                    {item.action.label} →
                  </Link>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
