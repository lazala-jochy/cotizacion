import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="modal-panel">
        <header className="modal-header">
          <div>
            <h2 id="payment-modal-title">Registrar pago parcial</h2>
            <p className="muted">
              {quote.numero} · {quote.client_nombre}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <QuotePaymentForm
          quote={quote}
          onSubmit={handleSubmit}
          busy={busy}
          error={error}
          onCancel={onClose}
          title="Datos del pago"
        />
        <footer className="modal-footer">
          <Link to={`/cotizaciones/${quote.id}`} className="btn-ghost btn-sm" onClick={onClose}>
            Ver detalle completo
          </Link>
        </footer>
      </div>
    </div>
  );
}
