import { useEffect, useState } from 'react';
import { api } from '../api';
import AppModal from './AppModal';

/**
 * Anular factura fiscal con motivo DGII (formato 608).
 */
export default function InvoiceAnnulModal({ invoice, open, onClose, onAnnulled }) {
  const [cancelReason, setCancelReason] = useState('04');
  const [motivoNota, setMotivoNota] = useState('');
  const [reasons, setReasons] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dgii
      .catalogs()
      .then((c) => setReasons(c.annulmentReasons || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setCancelReason('04');
      setMotivoNota('');
      setError('');
    }
  }, [open, invoice?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice) return;
    setError('');
    setBusy(true);
    try {
      const motivo = motivoNota.trim()
        ? `${cancelReason} — ${motivoNota.trim()}`
        : cancelReason;
      const updated = await api.invoices.annul(invoice.id, { motivo });
      onAnnulled?.(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!invoice) return null;

  return (
    <AppModal
      open={open}
      onClose={() => !busy && onClose()}
      busy={busy}
      busyMessage="Anulando factura…"
      title="Anular factura"
      subtitle={invoice.fiscal_number}
      titleId="annul-invoice-title"
      size="sm"
      footer={
        <div className="app-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            form="invoice-annul-form"
            className="btn-ghost danger"
            disabled={busy}
          >
            Anular factura
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}

      <p className="app-modal-message">
        La factura <strong>{invoice.fiscal_number}</strong> quedará marcada como{' '}
        <strong>anulada</strong> y se incluirá en el formato 608 del período correspondiente.
      </p>

      <form id="invoice-annul-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="span-2">
          Motivo DGII (608)
          <select
            required
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          >
            {reasons.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} — {r.label}
              </option>
            ))}
            {reasons.length === 0 && (
              <>
                <option value="04">04 — Corrección de la información</option>
                <option value="06">06 — Devolución de productos</option>
              </>
            )}
          </select>
        </label>
        <label className="span-2">
          Notas adicionales
          <span className="field-hint muted">Opcional. Queda en el historial de la factura.</span>
          <textarea
            rows={2}
            value={motivoNota}
            onChange={(e) => setMotivoNota(e.target.value)}
            placeholder="Detalle interno…"
          />
        </label>
      </form>
    </AppModal>
  );
}
