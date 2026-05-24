import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyClient = { nombre: '', rnc: '', direccion: '', telefono: '', email: '', notas: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyClient);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.clients
      .list()
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(emptyClient);
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (client) => {
    setForm({
      nombre: client.nombre || '',
      rnc: client.rnc || '',
      direccion: client.direccion || '',
      telefono: client.telefono || '',
      email: client.email || '',
      notas: client.notas || '',
    });
    setEditingId(client.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.clients.update(editingId, form);
      } else {
        await api.clients.create(form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.clients.remove(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Guarda y reutiliza datos de tus clientes</p>
        </div>
        <button type="button" className="btn-primary" onClick={openNew}>
          + Nuevo cliente
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <section className="panel form-panel">
          <h2>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Nombre *
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </label>
            <label>
              RNC
              <input value={form.rnc} onChange={(e) => setForm({ ...form, rnc: e.target.value })} />
            </label>
            <label className="span-2">
              Dirección
              <input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />
            </label>
            <label>
              Teléfono
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="span-2">
              Notas
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={2}
              />
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : clients.length === 0 ? (
          <p className="muted">No hay clientes. Agrega el primero.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RNC</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.rnc || '—'}</td>
                  <td>{c.telefono || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td className="actions">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(c)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm danger"
                      onClick={() => handleDelete(c.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
