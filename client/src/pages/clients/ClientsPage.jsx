import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Users } from 'lucide-react';
import { api } from '../../api';
import { useClientsCrm } from '../../features/dashboard/hooks/useDashboardData';
import { formatMoney } from '../../utils/formatMoney';
import DashboardSkeleton from '../../features/dashboard/components/DashboardSkeleton';

const STATUS_CLASS = {
  activo: 'erp-status-active',
  nuevo: 'erp-status-new',
  inactivo: 'erp-status-idle',
  dormido: 'erp-status-sleep',
  con_deuda: 'erp-status-debt',
};

export default function ClientsPage() {
  const { clients, loading, error, reload } = useClientsCrm();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', rnc: '', email: '', telefono: '', direccion: '', notas: '' });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.rnc?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.clients.create(form);
      setShowForm(false);
      setForm({ nombre: '', rnc: '', email: '', telefono: '', direccion: '', notas: '' });
      reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="page erp-dashboard">
      <header className="erp-page-header">
        <div>
          <h1>
            <Users size={24} aria-hidden /> Clientes
          </h1>
          <p>CRM ligero — historial, compras y estado comercial.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} aria-hidden /> Nuevo cliente
        </button>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="erp-toolbar">
        <Search size={18} aria-hidden />
        <input
          type="search"
          placeholder="Buscar por nombre, RNC o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <motion.form
          className="erp-panel erp-client-form"
          onSubmit={handleCreate}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>Nuevo cliente</h2>
          <div className="erp-form-grid">
            <label>
              Nombre *
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label>
              RNC
              <input value={form.rnc} onChange={(e) => setForm({ ...form, rnc: e.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Teléfono
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </label>
            <label className="erp-span-2">
              Dirección
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </label>
          </div>
          <div className="erp-form-actions">
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </motion.form>
      )}

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total comprado</th>
              <th>Última compra</th>
              <th>Pendientes</th>
              <th>Cotizaciones</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <td>
                  <strong>{c.nombre}</strong>
                  <span className="erp-table-sub">{c.email || c.rnc || '—'}</span>
                </td>
                <td>
                  <span className={`erp-status-pill ${STATUS_CLASS[c.status] || ''}`}>{c.statusLabel}</span>
                </td>
                <td>{formatMoney(c.totalPurchased)}</td>
                <td>{c.lastPurchase || '—'}</td>
                <td>{c.pendingInvoices > 0 ? `${c.pendingInvoices} (${formatMoney(c.pendingBalance)})` : '—'}</td>
                <td>{c.quoteCount}</td>
                <td>
                  <Link to={`/clientes/${c.id}`} className="btn-ghost btn-sm">
                    Ver
                  </Link>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="erp-muted erp-table-empty">No hay clientes registrados.</p>}
      </div>
    </div>
  );
}
