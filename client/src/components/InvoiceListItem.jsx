import { Link } from 'react-router-dom';
import { IconEye, IconEdit, IconTrash } from './Icons';
import {
  INVOICE_ESTADO_OPTIONS,
  invoiceEstadoHint,
  canEditInvoice,
  normalizeInvoiceEstado,
} from '../constants/invoiceEstados';
import { invoiceBalancePendiente } from '../utils/invoiceListFilters';

export function InvoiceTableRow({
  inv,
  formatDate,
  formatMoney,
  savingEstadoId,
  downloadingId,
  onEstadoChange,
  onDownloadPdf,
  onDelete,
}) {
  const balance = invoiceBalancePendiente(inv);

  return (
    <tr>
      <td className="q-col-num">
        <Link
          to={`/facturas/${inv.id}`}
          className="quote-num-link"
          title={inv.fiscal_number}
        >
          {inv.fiscal_number}
        </Link>
      </td>
      <td className="q-col-client">
        <span className="cell-ellipsis" title={inv.client_nombre}>
          {inv.client_nombre || '—'}
        </span>
      </td>
      <td className="q-col-date">{formatDate(inv.fecha_emision)}</td>
      <td className="q-col-money">
        <strong>{formatMoney(inv.total)}</strong>
      </td>
      <td className="q-col-money">
        <span className={balance > 0.009 ? 'quote-pending-amount' : 'muted'}>
          {formatMoney(balance)}
        </span>
      </td>
      <td className="q-col-estado">
        <select
          className={`quotes-estado-select estado-${normalizeInvoiceEstado(inv.estado)}`}
          value={normalizeInvoiceEstado(inv.estado)}
          onChange={(e) => onEstadoChange(inv.id, e.target.value)}
          disabled={savingEstadoId === inv.id || inv.estado === 'anulada'}
          title={invoiceEstadoHint(inv.estado)}
          aria-label={`Estado de factura ${inv.fiscal_number}`}
        >
          {INVOICE_ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="q-col-pdf">
        <button
          type="button"
          className="btn-ghost btn-sm btn-download-pdf"
          onClick={() => onDownloadPdf(inv)}
          disabled={downloadingId === inv.id}
          title="Descargar PDF de factura"
        >
          {downloadingId === inv.id ? '…' : 'PDF'}
        </button>
      </td>
      <td className="q-col-factura">
        {inv.quote_id ? (
          <Link
            to={`/cotizaciones/${inv.quote_id}`}
            className="btn-ghost btn-sm btn-convert-invoice"
            title="Ver cotización origen"
          >
            COT
          </Link>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td className="q-col-actions">
        <InvoiceRowActions inv={inv} onDelete={onDelete} />
      </td>
    </tr>
  );
}

export function InvoiceCard({
  inv,
  formatDate,
  formatMoney,
  savingEstadoId,
  downloadingId,
  onEstadoChange,
  onDownloadPdf,
  onDelete,
}) {
  const balance = invoiceBalancePendiente(inv);

  return (
    <article className="quote-card">
      <header className="quote-card-header">
        <div>
          <Link to={`/facturas/${inv.id}`} className="quote-num-link">
            {inv.fiscal_number}
          </Link>
          <p className="quote-card-client">{inv.client_nombre}</p>
        </div>
        <div className="quote-card-totals">
          <span className="quote-card-total-label">Total</span>
          <strong>{formatMoney(inv.total)}</strong>
          {balance > 0.009 && (
            <span className="quote-card-pending">Pendiente {formatMoney(balance)}</span>
          )}
        </div>
      </header>
      <p className="quote-card-date muted">{formatDate(inv.fecha_emision)}</p>
      <label className="quote-card-estado-label">
        Estado
        <select
          className={`quotes-estado-select estado-${normalizeInvoiceEstado(inv.estado)}`}
          value={normalizeInvoiceEstado(inv.estado)}
          onChange={(e) => onEstadoChange(inv.id, e.target.value)}
          disabled={savingEstadoId === inv.id || inv.estado === 'anulada'}
          title={invoiceEstadoHint(inv.estado)}
        >
          {INVOICE_ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="quote-card-doc-actions">
        <button
          type="button"
          className="btn-ghost btn-sm btn-download-pdf"
          onClick={() => onDownloadPdf(inv)}
          disabled={downloadingId === inv.id}
        >
          {downloadingId === inv.id ? '…' : 'PDF'}
        </button>
        {inv.quote_id ? (
          <Link
            to={`/cotizaciones/${inv.quote_id}`}
            className="btn-ghost btn-sm btn-convert-invoice"
          >
            COT
          </Link>
        ) : (
          <span className="btn-ghost btn-sm muted" style={{ textAlign: 'center' }}>
            —
          </span>
        )}
      </div>
      <footer className="quote-card-footer">
        <InvoiceRowActions inv={inv} onDelete={onDelete} />
      </footer>
    </article>
  );
}

function InvoiceRowActions({ inv, onDelete }) {
  const editable = canEditInvoice(inv.estado);
  const isAnulada = normalizeInvoiceEstado(inv.estado) === 'anulada';

  return (
    <div className="row-actions">
      <Link
        to={`/facturas/${inv.id}`}
        className="btn-icon"
        title="Ver factura"
        aria-label="Ver factura"
      >
        <IconEye />
      </Link>
      {editable && (
        <Link
          to={`/facturas/${inv.id}/editar`}
          className="btn-icon"
          title="Editar factura"
          aria-label="Editar factura"
        >
          <IconEdit />
        </Link>
      )}
      <button
        type="button"
        className="btn-icon btn-icon-danger"
        onClick={() => onDelete(inv)}
        title={isAnulada ? 'Eliminar' : 'Anular'}
        aria-label={isAnulada ? 'Eliminar factura' : 'Anular factura'}
      >
        <IconTrash />
      </button>
    </div>
  );
}
