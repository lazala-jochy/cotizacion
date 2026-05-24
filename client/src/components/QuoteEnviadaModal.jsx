import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import QuoteSendEmailModal from './QuoteSendEmailModal';

export default function QuoteEnviadaModal({ quote, onClose, onUpdated }) {
  const [step, setStep] = useState('prompt');
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  const handleMarkOnly = async () => {
    setMarking(true);
    setError('');
    try {
      const updated = await api.quotes.setEstado(quote.id, 'enviada');
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(false);
    }
  };

  const handleSendClick = () => {
    setError('');
    setStep('email');
  };

  if (step === 'email') {
    return (
      <QuoteSendEmailModal
        quote={quote}
        onClose={() => setStep('prompt')}
        onSent={(updated) => {
          onUpdated(updated);
          onClose();
        }}
        onBack={() => setStep('prompt')}
        submitLabel="Enviar y marcar como enviada"
      />
    );
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="enviada-modal-title">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <h2 id="enviada-modal-title">Marcar como enviada</h2>
            <p className="muted modal-subtitle">
              Cotización {quote.numero}
              {quote.client_nombre ? ` — ${quote.client_nombre}` : ''}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <p className="enviada-modal-text">
          ¿Deseas enviar la cotización por correo al cliente al cambiar el estado a{' '}
          <strong>Enviada</strong>?
        </p>

        <div className="enviada-modal-actions">
          <button type="button" className="btn-primary" onClick={handleSendClick}>
            Enviar por correo
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleMarkOnly}
            disabled={marking}
          >
            {marking ? 'Guardando…' : 'Solo marcar como enviada'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={marking}>
            Cancelar
          </button>
        </div>

        <p className="enviada-modal-hint muted">
          El correo adjunta el PDF. Configura Gmail en{' '}
          <Link to="/configuracion" onClick={onClose}>
            Empresa
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
