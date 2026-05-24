import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';
import { IconEye, IconEdit, IconTrash } from '../components/Icons';

const PAGE_SIZE_DEFAULT = 5;
const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'aceptada', label: 'Aceptada' },
  { value: 'rechazada', label: 'Rechazada' },
];

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  useEffect(() => {
    api.quotes
      .list()
      .then(setQuotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((item) => {
      if (estadoFilter && item.estado !== estadoFilter) return false;
      if (!q) return true;
      const haystack = [item.numero, item.client_nombre, item.client_rnc, item.fecha]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [quotes, search, estadoFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, estadoFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filtered.length);

  const handleDownloadPdf = async (q) => {
    setDownloadingId(q.id);
    setError('');
    try {
      await downloadInvoicePdf(q.id, q.numero);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    try {
      await api.quotes.remove(id);
      setQuotes((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setEstadoFilter('');
  };

  const hasFilters = Boolean(search.trim() || estadoFilter);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Cotizaciones</h1>
          <p>Listado de cotizaciones generadas</p>
        </div>
        <Link to="/cotizaciones/nueva" className="btn-primary">
          + Nueva cotización
        </Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel quotes-panel">
        <div className="quotes-toolbar">
          <div className="quotes-filters">
            <label className="quotes-search">
              <span className="sr-only">Buscar</span>
              <input
                type="search"
                placeholder="Buscar número, cliente, RNC…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              className="quotes-filter-select"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              aria-label="Filtrar por estado"
            >
              {ESTADOS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
              : 'No hay cotizaciones'
            : `Mostrando ${rangeStart}–${rangeEnd} de ${filtered.length}`}
          </p>
        </div>

        {loading ? (
          <p className="muted quotes-empty">Cargando cotizaciones…</p>
        ) : quotes.length === 0 ? (
          <div className="quotes-empty">
            <p className="muted">No hay cotizaciones aún.</p>
            <Link to="/cotizaciones/nueva" className="btn-primary btn-sm">
              Crear la primera
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="quotes-empty">
            <p className="muted">Ninguna cotización coincide con tu búsqueda.</p>
            <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
              Quitar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="quotes-table-wrap">
              <table className="data-table quotes-table quotes-table-quotes">
                <colgroup>
                  <col className="col-w-num" />
                  <col className="col-w-client" />
                  <col className="col-w-date" />
                  <col className="col-w-total" />
                  <col className="col-w-estado" />
                  <col className="col-w-download" />
                  <col className="col-w-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th className="col-hide-sm">Fecha</th>
                    <th className="col-num">Total</th>
                    <th className="col-hide-xs">Estado</th>
                    <th className="col-download">PDF</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <Link
                          to={`/cotizaciones/${q.id}`}
                          className="quote-num-link cell-ellipsis"
                          title={q.numero}
                        >
                          {q.numero}
                        </Link>
                      </td>
                      <td className="col-client">
                        <span className="cell-ellipsis" title={q.client_nombre}>
                          {q.client_nombre}
                        </span>
                      </td>
                      <td className="col-date col-hide-sm">
                        <span className="cell-ellipsis">{formatDate(q.fecha)}</span>
                      </td>
                      <td className="col-num">
                        <strong>{formatMoney(q.total)}</strong>
                      </td>
                      <td className="col-hide-xs">
                        <span className={`badge badge-${q.estado}`}>{q.estado}</span>
                      </td>
                      <td className="col-download">
                        <button
                          type="button"
                          className="btn-ghost btn-sm btn-download-pdf"
                          onClick={() => handleDownloadPdf(q)}
                          disabled={downloadingId === q.id}
                          title="Descargar factura PDF"
                        >
                          {downloadingId === q.id ? '…' : 'PDF'}
                        </button>
                      </td>
                      <td className="actions">
                        <div className="row-actions">
                          <Link
                            to={`/cotizaciones/${q.id}`}
                            className="btn-icon"
                            title="Ver"
                            aria-label="Ver cotización"
                          >
                            <IconEye />
                          </Link>
                          <Link
                            to={`/cotizaciones/${q.id}/editar`}
                            className="btn-icon"
                            title="Editar"
                            aria-label="Editar cotización"
                          >
                            <IconEdit />
                          </Link>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(q.id)}
                            title="Eliminar"
                            aria-label="Eliminar cotización"
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
