import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ConfirmModal from './ConfirmModal';

/**
 * Convierte una cotización en factura fiscal (cotización intacta).
 */
export default function QuoteConvertToInvoiceButton({
  quoteId,
  quoteNumero,
  className = 'btn-primary btn-sm',
  label = 'Convertir a factura',
  busyLabel = 'Convirtiendo…',
  onError,
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      const invoice = await api.invoices.fromQuote(quoteId);
      setConfirmOpen(false);
      navigate(`/facturas/${invoice.id}`);
    } catch (err) {
      const msg = err.message || 'No se pudo crear la factura';
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setError('');
          setConfirmOpen(true);
        }}
        disabled={busy}
      >
        {busy ? busyLabel : label}
      </button>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        title="Convertir a factura"
        subtitle={quoteNumero ? `Cotización ${quoteNumero}` : undefined}
        titleId="convert-invoice-title"
        confirmLabel={busy ? busyLabel : 'Convertir a factura'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirm}
        busy={busy}
        error={error}
      >
        <p className="app-modal-message">
          Se creará una <strong>factura fiscal nueva</strong> con los mismos datos (cliente,
          ítems, impuestos y totales). La cotización original <strong>no se modifica</strong>.
        </p>
        <p className="app-modal-hint muted">
          Necesitas un rango fiscal activo en{' '}
          <Link to="/configuracion" onClick={() => setConfirmOpen(false)}>
            Empresa → Facturación fiscal
          </Link>
          .
        </p>
      </ConfirmModal>
    </>
  );
}
