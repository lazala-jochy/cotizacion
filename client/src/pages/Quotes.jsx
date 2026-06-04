import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';
import { QuoteCard, QuoteTableRow } from '../components/QuoteListItem';
import QuotePaymentModal from '../components/QuotePaymentModal';
import QuoteEnviadaModal from '../components/QuoteEnviadaModal';
import ConfirmModal from '../components/ConfirmModal';
import {
  QUOTE_ESTADOS,
  normalizeEstado,
  shouldPromptPayment,
  shouldPromptSendOnEnviada,
} from '../constants/quoteEstados';
import {
  MONTO_FILTER_OPTIONS,
  getFilterYearOptions,
  quoteMatchesListFilters,
} from '../utils/quoteListFilters';
import MonthYearFilterFields from '../components/filters/MonthYearFilterFields';
import { getDefaultYearMonth } from '../utils/dateRangeFilters';

const PAGE_SIZE_DEFAULT = 5;
const defaultMonthFilter = getDefaultYearMonth();

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
  const [savingEstadoId, setSavingEstadoId] = useState(null);
  const [paymentModalQuote, setPaymentModalQuote] = useState(null);
  const [enviadaModalQuote, setEnviadaModalQuote] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(defaultMonthFilter.year);
  const [monthFilter, setMonthFilter] = useState(defaultMonthFilter.month);
  const [montoFilter, setMontoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  useEffect(() => {
    api.quotes
      .list()
      .then(setQuotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const yearOptions = useMemo(() => getFilterYearOptions(quotes), [quotes]);

  const filtered = useMemo(
    () =>
      quotes.filter((item) =>
        quoteMatchesListFilters(item, {
          search,
          estadoFilter,
          yearFilter,
          monthFilter,
          montoFilter,
          normalizeEstado,
        })
      ),
    [quotes, search, estadoFilter, yearFilter, monthFilter, montoFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, estadoFilter, yearFilter, monthFilter, montoFilter, pageSize]);

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

  const applyEstadoChange = async (quoteId, nuevoEstado) => {
    setSavingEstadoId(quoteId);
    setError('');
    try {
      const updated = await api.quotes.setEstado(quoteId, nuevoEstado);
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, ...updated } : q))
      );
      const selectedEstado = normalizeEstado(nuevoEstado);
      if (
        selectedEstado === 'pago_parcial' &&
        shouldPromptPayment(updated.estado, updated.balance_pendiente)
      ) {
        setPaymentModalQuote(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEstadoId(null);
    }
  };

  const handleEstadoChange = (quoteId, nuevoEstado) => {
    const q = quotes.find((item) => item.id === quoteId);
    if (q && shouldPromptSendOnEnviada(nuevoEstado, q.estado)) {
      setEnviadaModalQuote(q);
      return;
    }
    applyEstadoChange(quoteId, nuevoEstado);
  };

  const handleEnviadaUpdated = (updated) => {
    setQuotes((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    setEnviadaModalQuote(null);
    if (shouldPromptPayment(updated.estado, updated.balance_pendiente)) {
      setPaymentModalQuote(updated);
    }
  };

  const handlePaymentUpdated = (updated) => {
    setQuotes((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    setPaymentModalQuote(null);
  };

  const openDeleteConfirm = (id) => {
    const q = quotes.find((x) => x.id === id);
    if (q) {
      setDeleteError('');
      setDeleteTarget(q);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await api.quotes.remove(deleteTarget.id);
      setQuotes((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setEstadoFilter('');
    setYearFilter('');
    setMonthFilter('');
    setMontoFilter('');
  };

  const hasFilters = Boolean(
    search.trim() || estadoFilter || yearFilter || monthFilter || montoFilter
  );

  const listSummary =
    loading ?
      'Cargando…'
    : filtered.length === 0 ?
      hasFilters ?
        'Sin resultados para los filtros'
      : 'No hay cotizaciones'
    : `Mostrando ${rangeStart}–${rangeEnd} de ${filtered.length}`;

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

      {paymentModalQuote && (
        <QuotePaymentModal
          quote={paymentModalQuote}
          onClose={() => setPaymentModalQuote(null)}
          onUpdated={handlePaymentUpdated}
        />
      )}

      {enviadaModalQuote && (
        <QuoteEnviadaModal
          quote={enviadaModalQuote}
          onClose={() => setEnviadaModalQuote(null)}
          onUpdated={handleEnviadaUpdated}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        title="Eliminar cotización"
        subtitle={deleteTarget?.numero}
        titleId="delete-quote-title"
        confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar cotización'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        busy={deleteBusy}
        error={deleteError}
        confirmVariant="danger"
      >
        <p className="app-modal-message">
          Se borrará la cotización <strong>{deleteTarget?.numero}</strong> y su historial de pagos.
          Esta acción no se puede deshacer.
        </p>
      </ConfirmModal>

      <section className="panel quotes-panel">
        <div className="quotes-toolbar">
          <div className="quotes-filters-bar" role="group" aria-label="Filtros de cotizaciones">
            <label className="quotes-filter-field quotes-filter-field--search">
              <span className="quotes-filter-label">Buscar</span>
              <input
                type="search"
                className="quotes-filter-input"
                placeholder="Número, cliente, RNC…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <MonthYearFilterFields
              year={yearFilter}
              month={monthFilter}
              onYearChange={setYearFilter}
              onMonthChange={setMonthFilter}
              yearOptions={[{ value: '', label: 'Todos' }, ...yearOptions]}
              idPrefix="quotes"
            />
            <label className="quotes-filter-field quotes-filter-field--monto">
              <span className="quotes-filter-label">Monto</span>
              <select
                className="quotes-filter-select"
                value={montoFilter}
                onChange={(e) => setMontoFilter(e.target.value)}
              >
                {MONTO_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="quotes-filter-field quotes-filter-field--estado">
              <span className="quotes-filter-label">Estado</span>
              <select
                className="quotes-filter-select"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
              >
                {QUOTE_ESTADOS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {hasFilters && (
              <div className="quotes-filter-field quotes-filter-field--action">
                <span className="quotes-filter-label" aria-hidden="true">
                  &nbsp;
                </span>
                <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
                  Limpiar
                </button>
              </div>
            )}
          </div>
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
            <div className="quotes-list-desktop quotes-table-wrap">
              <table className="data-table quotes-table quotes-table-quotes">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Pendiente</th>
                    <th>Estado</th>
                    <th>PDF</th>
                    <th>Factura</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((q) => (
                    <QuoteTableRow
                      key={q.id}
                      q={q}
                      formatDate={formatDate}
                      formatMoney={formatMoney}
                      savingEstadoId={savingEstadoId}
                      downloadingId={downloadingId}
                      onEstadoChange={handleEstadoChange}
                      onDownloadPdf={handleDownloadPdf}
                      onDelete={openDeleteConfirm}
                      onRegisterPayment={setPaymentModalQuote}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="quotes-list-mobile">
              {paginated.map((q) => (
                <QuoteCard
                  key={q.id}
                  q={q}
                  formatDate={formatDate}
                  formatMoney={formatMoney}
                  savingEstadoId={savingEstadoId}
                  downloadingId={downloadingId}
                  onEstadoChange={handleEstadoChange}
                  onDownloadPdf={handleDownloadPdf}
                  onDelete={openDeleteConfirm}
                  onRegisterPayment={setPaymentModalQuote}
                />
              ))}
            </div>

            <footer className="quotes-pagination">
              <div className="quotes-pagination-start">
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
                <p className="quotes-summary muted">{listSummary}</p>
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
