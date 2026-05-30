import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppModal from './AppModal';
import QuotePaymentForm from './QuotePaymentForm';

export default function QuotePaymentModal({ quote, onClose, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (payload) => {
    setBusy(true);
    setError('');
    try {
      const { quote: updated } = await api.quotes.addPayment(quote.id, payload);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open
      onClose={onClose}
      title="Registrar pago parcial"
      subtitle={`${quote.numero} · ${quote.client_nombre || 'Sin cliente'}`}
      titleId="payment-modal-title"
      size="md"
      footer={
        <Link
          to={`/cotizaciones/${quote.id}`}
          className="btn-ghost btn-sm"
          onClick={onClose}
        >
          Ver detalle completo de la cotización
        </Link>
      }
    >
      <QuotePaymentForm
        quote={quote}
        onSubmit={handleSubmit}
        busy={busy}
        error={error}
        onCancel={onClose}
        title="Datos del pago"
      />
    </AppModal>
  );
}
