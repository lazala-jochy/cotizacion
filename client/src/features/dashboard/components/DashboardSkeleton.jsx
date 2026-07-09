import { motion } from 'framer-motion';

export default function DashboardSkeleton() {
  return (
    <div className="erp-dashboard erp-skeleton" aria-busy="true" aria-label="Cargando dashboard">
      <div className="erp-skeleton-header" />
      <div className="erp-kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="erp-kpi-card erp-skeleton-block"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
      </div>
      <div className="erp-charts-grid">
        <div className="erp-panel erp-skeleton-block erp-skeleton-chart" />
        <div className="erp-panel erp-skeleton-block erp-skeleton-chart" />
      </div>
    </div>
  );
}
