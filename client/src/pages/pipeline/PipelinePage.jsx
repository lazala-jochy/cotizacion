import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Kanban } from 'lucide-react';
import { usePipeline } from '../../features/dashboard/hooks/useDashboardData';
import { formatMoneyCompact } from '../../utils/formatMoney';
import DashboardSkeleton from '../../features/dashboard/components/DashboardSkeleton';

const STAGE_COLORS = {
  nueva: '#64748b',
  negociacion: '#3b82f6',
  aprobada: '#8b5cf6',
  facturada: '#f59e0b',
  cobrada: '#22c55e',
};

export default function PipelinePage() {
  const { board, loading, error, moveQuote } = usePipeline();
  const [dragging, setDragging] = useState(null);

  const onDrop = async (stageId) => {
    if (!dragging || dragging === stageId) return;
    const quoteId = dragging;
    setDragging(null);
    try {
      await moveQuote(quoteId, stageId);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="page erp-dashboard erp-pipeline-page">
      <header className="erp-page-header">
        <div>
          <h1>
            <Kanban size={24} aria-hidden /> Pipeline comercial
          </h1>
          <p>Arrastra cotizaciones entre etapas del embudo de ventas.</p>
        </div>
        <Link to="/cotizaciones/nueva" className="btn-primary">
          + Nueva cotización
        </Link>
      </header>

      <div className="erp-kanban">
        {board?.columns?.map((col) => (
          <motion.section
            key={col.id}
            className="erp-kanban-col"
            style={{ '--kanban-accent': STAGE_COLORS[col.id] }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
            layout
          >
            <header className="erp-kanban-col-header">
              <h2>{col.label}</h2>
              <span className="erp-kanban-count">{col.quotes.length}</span>
              <span className="erp-kanban-total">{formatMoneyCompact(col.total)}</span>
            </header>
            <ul className="erp-kanban-cards">
              {col.quotes.map((q) => (
                <motion.li
                  key={q.id}
                  className="erp-kanban-card"
                  draggable
                  onDragStart={() => setDragging(q.id)}
                  onDragEnd={() => setDragging(null)}
                  whileHover={{ scale: 1.01 }}
                  layout
                >
                  <Link to={`/cotizaciones/${q.id}`}>
                    <strong>{q.numero}</strong>
                    <span>{q.client_nombre || 'Sin cliente'}</span>
                    <span className="erp-kanban-amount">{formatMoneyCompact(q.total)}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
