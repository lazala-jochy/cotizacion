import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppModal from './AppModal';
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
    <AppModal
      open
      onClose={() => !marking && onClose()}
      busy={marking}
      busyMessage="Guardando…"
      title="Marcar como enviada"
      subtitle={
        quote.client_nombre
          ? `${quote.numero} — ${quote.client_nombre}`
          : quote.numero
      }
      titleId="enviada-modal-title"
      size="sm"
      footer={
        <div className="app-modal-actions app-modal-actions--stack">
          <button type="button" className="btn-primary" onClick={handleSendClick}>
            Enviar por correo
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleMarkOnly}
            disabled={marking}
          >
            Solo marcar como enviada
          </button>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={marking}>
            Cancelar
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}

      <p className="app-modal-message">
        ¿Deseas enviar la cotización por correo al cambiar el estado a <strong>Enviada</strong>?
      </p>
      <p className="app-modal-hint muted">
        El correo incluye el PDF adjunto. Configura Gmail en{' '}
        <Link to="/configuracion" onClick={onClose}>
          Empresa
        </Link>
        .
      </p>
    </AppModal>
  );
}
