import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { downloadFacturaPdf } from '../utils/downloadFacturaPdf';
import { InvoiceCard, InvoiceTableRow } from '../components/InvoiceListItem';
import ConfirmModal from '../components/ConfirmModal';
import InvoiceAnnulModal from '../components/InvoiceAnnulModal';
import { INVOICE_ESTADOS_FILTER, normalizeInvoiceEstado } from '../constants/invoiceEstados';
import {
  MONTO_FILTER_OPTIONS,
  MONTH_FILTER_OPTIONS,
  getInvoiceFilterYearOptions,
  invoiceMatchesListFilters,
} from '../utils/invoiceListFilters';

const PAGE_SIZE_DEFAULT = 5;

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

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [savingEstadoId, setSavingEstadoId] = useState(null);
  const [annulTarget, setAnnulTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [montoFilter, setMontoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  useEffect(() => {
    api.invoices
      .list()
      .then(setInvoices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const yearOptions = useMemo(() => getInvoiceFilterYearOptions(invoices), [invoices]);

  const filtered = useMemo(
    () =>
      invoices.filter((item) =>
        invoiceMatchesListFilters(item, {
          search,
          estadoFilter,
          yearFilter,
          monthFilter,
          montoFilter,
        })
      ),
    [invoices, search, estadoFilter, yearFilter, monthFilter, montoFilter]
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

  const handleDownloadPdf = async (inv) => {
    setDownloadingId(inv.id);
    setError('');
    try {
      await downloadFacturaPdf(inv.id, inv.fiscal_number);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEstadoChange = async (invoiceId, nuevoEstado) => {
    setSavingEstadoId(invoiceId);
    setError('');
    try {
      const updated = await api.invoices.setEstado(invoiceId, nuevoEstado);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...updated } : inv))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEstadoId(null);
    }
  };

  const handleDeleteClick = (inv) => {
    if (normalizeInvoiceEstado(inv.estado) === 'anulada') {
      setDeleteError('');
      setDeleteTarget(inv);
      return;
    }
    setAnnulTarget(inv);
  };

  const handleAnnulled = (updated) => {
    setInvoices((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await api.invoices.remove(deleteTarget.id);
      setInvoices((prev) => prev.filter((x) => x.id !== deleteTarget.id));
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
      : 'No hay facturas'
    : `Mostrando ${rangeStart}–${rangeEnd} de ${filtered.length}`;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Facturas</h1>
          <p>Listado de facturas fiscales emitidas</p>
        </div>
        <Link to="/facturas/nueva" className="btn-primary">
          + Nueva factura
        </Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <InvoiceAnnulModal
        invoice={annulTarget}
        open={Boolean(annulTarget)}
        onClose={() => setAnnulTarget(null)}
        onAnnulled={handleAnnulled}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        title="Eliminar factura"
        subtitle={deleteTarget?.fiscal_number}
        titleId="delete-invoice-title"
        confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar permanentemente'}
        onConfirm={handleConfirmDeleteInvoice}
        busy={deleteBusy}
        error={deleteError}
        confirmVariant="danger"
      >
        <p className="app-modal-message">
          Se borrará la factura anulada <strong>{deleteTarget?.fiscal_number}</strong> de forma
          permanente. Esta acción no se puede deshacer.
        </p>
      </ConfirmModal>

      <section className="panel quotes-panel">
        <div className="quotes-toolbar">
          <div className="quotes-filters-bar" role="group" aria-label="Filtros de facturas">
            <label className="quotes-filter-field quotes-filter-field--search">
              <span className="quotes-filter-label">Buscar</span>
              <input
                type="search"
                className="quotes-filter-input"
                placeholder="NCF, cliente, RNC…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="quotes-filter-field quotes-filter-field--year">
              <span className="quotes-filter-label">Año</span>
              <select
                className="quotes-filter-select"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {yearOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="quotes-filter-field quotes-filter-field--month">
              <span className="quotes-filter-label">Mes</span>
              <select
                className="quotes-filter-select"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                {MONTH_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
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
                {INVOICE_ESTADOS_FILTER.map((o) => (
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
          <p className="muted quotes-empty">Cargando facturas…</p>
        ) : invoices.length === 0 ? (
          <div className="quotes-empty">
            <p className="muted">No hay facturas aún.</p>
            <Link to="/facturas/nueva" className="btn-primary btn-sm">
              Crear la primera
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="quotes-empty">
            <p className="muted">Ninguna factura coincide con tu búsqueda.</p>
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
                    <th>Cotización</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv) => (
                    <InvoiceTableRow
                      key={inv.id}
                      inv={inv}
                      formatDate={formatDate}
                      formatMoney={formatMoney}
                      savingEstadoId={savingEstadoId}
                      downloadingId={downloadingId}
                      onEstadoChange={handleEstadoChange}
                      onDownloadPdf={handleDownloadPdf}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="quotes-list-mobile">
              {paginated.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  inv={inv}
                  formatDate={formatDate}
                  formatMoney={formatMoney}
                  savingEstadoId={savingEstadoId}
                  downloadingId={downloadingId}
                  onEstadoChange={handleEstadoChange}
                  onDownloadPdf={handleDownloadPdf}
                  onDelete={handleDeleteClick}
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
