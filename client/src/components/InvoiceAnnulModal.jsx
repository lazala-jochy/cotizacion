import { useEffect, useState } from 'react';
import { api } from '../api';
import AppModal from './AppModal';

/**
 * Anular factura fiscal con motivo opcional.
 */
export default function InvoiceAnnulModal({ invoice, open, onClose, onAnnulled }) {
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMotivo('');
      setError('');
    }
  }, [open, invoice?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice) return;
    setError('');
    setBusy(true);
    try {
      const updated = await api.invoices.annul(invoice.id, {
        motivo: motivo.trim() || undefined,
      });
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
            {busy ? 'Anulando…' : 'Anular factura'}
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}

      <p className="app-modal-message">
        La factura <strong>{invoice.fiscal_number}</strong> quedará marcada como{' '}
        <strong>anulada</strong>. No se borra del sistema; podrás eliminarla después si lo
        necesitas.
      </p>

      <form id="invoice-annul-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="span-2">
          Motivo de anulación
          <span className="field-hint muted">Opcional. Queda registrado en el historial.</span>
          <textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: error en datos del cliente, duplicado…"
          />
        </label>
      </form>
    </AppModal>
  );
}
