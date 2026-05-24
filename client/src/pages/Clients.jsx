import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { IconEdit, IconTrash } from '../components/Icons';

const PAGE_SIZE_DEFAULT = 5;
const emptyClient = { nombre: '', rnc: '', direccion: '', telefono: '', email: '', notas: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyClient);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = [c.nombre, c.rnc, c.telefono, c.email, c.direccion, c.notas]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filtered.length);
  const hasFilters = Boolean(search.trim());

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
        const updated = await api.clients.update(editingId, form);
        setClients((prev) =>
          prev
            .map((c) => (c.id === editingId ? updated : c))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        );
      } else {
        const created = await api.clients.create(form);
        setClients((prev) =>
          [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
      }
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.clients.remove(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const clearFilters = () => setSearch('');

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

      <section className="panel quotes-panel">
        <div className="quotes-toolbar">
          <div className="quotes-filters">
            <label className="quotes-search">
              <span className="sr-only">Buscar</span>
              <input
                type="search"
                placeholder="Buscar nombre, RNC, email, teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {hasFilters && (
              <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
                Limpiar
              </button>
            )}
          </div>
          <p className="quotes-summary muted">
            {loading ?
              'Cargando…'
            : filtered.length === 0 ?
              hasFilters ?
                'Sin resultados para los filtros'
              : 'No hay clientes'
            : `Mostrando ${rangeStart}–${rangeEnd} de ${filtered.length}`}
          </p>
        </div>

        {loading ? (
          <p className="muted quotes-empty">Cargando clientes…</p>
        ) : clients.length === 0 ? (
          <div className="quotes-empty">
            <p className="muted">No hay clientes aún.</p>
            <button type="button" className="btn-primary btn-sm" onClick={openNew}>
              Agregar el primero
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="quotes-empty">
            <p className="muted">Ningún cliente coincide con tu búsqueda.</p>
            <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
              Quitar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="quotes-table-wrap">
              <table className="data-table quotes-table quotes-table-clients">
                <colgroup>
                  <col className="col-w-name" />
                  <col className="col-w-rnc" />
                  <col className="col-w-tel" />
                  <col className="col-w-email" />
                  <col className="col-w-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>RNC</th>
                    <th className="col-hide-sm">Teléfono</th>
                    <th>Email</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="cell-ellipsis cell-ellipsis-strong" title={c.nombre}>
                          {c.nombre}
                        </span>
                      </td>
                      <td className="col-muted">
                        <span className="cell-ellipsis" title={c.rnc}>
                          {c.rnc || '—'}
                        </span>
                      </td>
                      <td className="col-muted col-hide-sm">
                        <span className="cell-ellipsis" title={c.telefono}>
                          {c.telefono || '—'}
                        </span>
                      </td>
                      <td className="col-email">
                        <span className="cell-ellipsis" title={c.email}>
                          {c.email || '—'}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => openEdit(c)}
                            title="Editar"
                            aria-label="Editar cliente"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(c.id)}
                            title="Eliminar"
                            aria-label="Eliminar cliente"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="quotes-pagination">
              <div className="quotes-page-size">
                <label>
                  Por página
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              {totalPages > 1 && (
                <div className="quotes-page-nav">
                  {page > 1 ? (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ← Anterior
                    </button>
                  ) : (
                    <span className="quotes-page-spacer" aria-hidden="true" />
                  )}
                  <span className="quotes-page-indicator">
                    Página {page} de {totalPages}
                  </span>
                  {page < totalPages ? (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente →
                    </button>
                  ) : (
                    <span className="quotes-page-spacer" aria-hidden="true" />
                  )}
                </div>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
