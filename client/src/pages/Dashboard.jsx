import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { useDashboardSummary, useAutomations } from '../features/dashboard/hooks/useDashboardData';
import ExecutiveKpiCards from '../features/dashboard/components/ExecutiveKpiCards';
import DashboardAnalytics from '../features/dashboard/components/DashboardAnalytics';
import BusinessInsights from '../features/dashboard/components/BusinessInsights';
import AutomationsPanel from '../features/dashboard/components/AutomationsPanel';
import NotificationPanel, { NotificationBell } from '../features/dashboard/components/NotificationPanel';
import DashboardSkeleton from '../features/dashboard/components/DashboardSkeleton';
import '../styles/erp-dashboard.css';

export default function Dashboard() {
  const { hasModule, isLicensed } = useLicense();
  const { data, loading, error, reload } = useDashboardSummary();
  const { settings, tasks, saving, save } = useAutomations();
  const [notifOpen, setNotifOpen] = useState(false);

  const showFinance = hasModule('compras') || hasModule('reportes') || hasModule('facturas');
  const notifCount = data?.notifications?.counts?.total || 0;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="page erp-dashboard">
      <header className="erp-page-header">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            Dashboard ejecutivo
          </motion.h1>
          <p>Vista general de ventas, cobros y pipeline comercial.</p>
        </div>
        <div className="erp-header-actions">
          <NotificationBell count={notifCount} onClick={() => setNotifOpen(true)} />
          <button type="button" className="btn-ghost btn-sm" onClick={reload} aria-label="Actualizar">
            <RefreshCw size={16} />
          </button>
          {hasModule('cotizaciones') && (
            <Link to="/cotizaciones/nueva" className="btn-primary">
              + Nueva cotización
            </Link>
          )}
        </div>
      </header>

      {!isLicensed && (
        <div className="alert alert-warn">
          Active su licencia en <Link to="/configuracion#licencia">Empresa → Licencia</Link>.
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {showFinance && data?.kpis && <ExecutiveKpiCards kpis={data.kpis} />}

      {showFinance && data?.analytics && <DashboardAnalytics analytics={data.analytics} />}

      <div className="erp-bottom-grid">
        <BusinessInsights insights={data?.insights} />
        {hasModule('cotizaciones') && (
          <AutomationsPanel settings={settings} tasks={tasks} saving={saving} onSave={save} />
        )}
      </div>

      <div className="erp-quick-links">
        {/*
        {hasModule('cotizaciones') && (
          <Link to="/pipeline" className="erp-quick-link">
            Pipeline comercial →
          </Link>
        )}
          */}
        {hasModule('cotizaciones') && (
          <Link to="/clientes" className="erp-quick-link">
            CRM Clientes →
          </Link>
        )}
        {hasModule('reportes') && (
          <Link to="/reportes" className="erp-quick-link">
            Reportes avanzados →
          </Link>
        )}
      </div>

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        data={data?.notifications}
      />
    </div>
  );
}
