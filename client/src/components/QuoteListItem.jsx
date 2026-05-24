import { Link } from 'react-router-dom';
import { IconEye, IconEdit, IconTrash } from './Icons';
import {
  QUOTE_ESTADO_OPTIONS,
  quoteEstadoHint,
  canEditQuoteContent,
  normalizeEstado,
} from '../constants/quoteEstados';

export function QuoteTableRow({
  q,
  formatDate,
  formatMoney,
  savingEstadoId,
  downloadingId,
  onEstadoChange,
  onDownloadPdf,
  onDelete,
}) {
  return (
    <tr>
      <td className="q-col-num">
        <Link to={`/cotizaciones/${q.id}`} className="quote-num-link" title={q.numero}>
          {q.numero}
        </Link>
      </td>
      <td className="q-col-client">
        <span className="cell-ellipsis" title={q.client_nombre}>
          {q.client_nombre}
        </span>
      </td>
      <td className="q-col-date">{formatDate(q.fecha)}</td>
      <td className="q-col-money">
        <strong>{formatMoney(q.total)}</strong>
      </td>
      <td className="q-col-money">
        <span className={(q.balance_pendiente ?? 0) > 0 ? 'quote-pending-amount' : 'muted'}>
          {formatMoney(q.balance_pendiente ?? 0)}
        </span>
      </td>
      <td className="q-col-estado">
        <select
          className={`quotes-estado-select estado-${normalizeEstado(q.estado)}`}
          value={normalizeEstado(q.estado)}
          onChange={(e) => onEstadoChange(q.id, e.target.value)}
          disabled={savingEstadoId === q.id}
          title={quoteEstadoHint(q.estado)}
          aria-label={`Estado de cotización ${q.numero}`}
        >
          {QUOTE_ESTADO_OPTIONS.map((o) => (
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
          onClick={() => onDownloadPdf(q)}
          disabled={downloadingId === q.id}
          title="Descargar factura PDF"
        >
          {downloadingId === q.id ? '…' : 'PDF'}
        </button>
      </td>
      <td className="q-col-actions">
        <QuoteRowActions q={q} onDelete={onDelete} />
      </td>
    </tr>
  );
}

export function QuoteCard({
  q,
  formatDate,
  formatMoney,
  savingEstadoId,
  downloadingId,
  onEstadoChange,
  onDownloadPdf,
  onDelete,
}) {
  return (
    <article className="quote-card">
      <header className="quote-card-header">
        <div>
          <Link to={`/cotizaciones/${q.id}`} className="quote-num-link">
            {q.numero}
          </Link>
          <p className="quote-card-client">{q.client_nombre}</p>
        </div>
        <div className="quote-card-totals">
          <span className="quote-card-total-label">Total</span>
          <strong>{formatMoney(q.total)}</strong>
          {(q.balance_pendiente ?? 0) > 0 && (
            <span className="quote-card-pending">
              Pendiente {formatMoney(q.balance_pendiente)}
            </span>
          )}
        </div>
      </header>
      <p className="quote-card-date muted">{formatDate(q.fecha)}</p>
      <label className="quote-card-estado-label">
        Estado
        <select
          className={`quotes-estado-select estado-${normalizeEstado(q.estado)}`}
          value={normalizeEstado(q.estado)}
          onChange={(e) => onEstadoChange(q.id, e.target.value)}
          disabled={savingEstadoId === q.id}
          title={quoteEstadoHint(q.estado)}
        >
          {QUOTE_ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <footer className="quote-card-footer">
        <button
          type="button"
          className="btn-ghost btn-sm btn-download-pdf"
          onClick={() => onDownloadPdf(q)}
          disabled={downloadingId === q.id}
        >
          {downloadingId === q.id ? 'Generando…' : 'Descargar PDF'}
        </button>
        <QuoteRowActions q={q} onDelete={onDelete} />
      </footer>
    </article>
  );
}

function QuoteRowActions({ q, onDelete }) {
  return (
    <div className="row-actions">
      <Link
        to={`/cotizaciones/${q.id}`}
        className="btn-icon"
        title="Ver detalle y pagos"
        aria-label="Ver cotización"
      >
        <IconEye />
      </Link>
      {canEditQuoteContent(q.estado) && (
        <Link
          to={`/cotizaciones/${q.id}/editar`}
          className="btn-icon"
          title="Editar contenido"
          aria-label="Editar cotización"
        >
          <IconEdit />
        </Link>
      )}
      <button
        type="button"
        className="btn-icon btn-icon-danger"
        onClick={() => onDelete(q.id)}
        title="Eliminar"
        aria-label="Eliminar cotización"
      >
        <IconTrash />
      </button>
    </div>
  );
}
