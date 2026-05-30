import { useEffect, useState } from 'react';
import { api } from '../api';
import AppModal from './AppModal';

export default function QuoteSendEmailModal({
  quote,
  onClose,
  onSent,
  onBack,
  submitLabel = 'Enviar correo',
}) {
  const [to, setTo] = useState(quote.client_email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTo(quote.client_email || '');
  }, [quote.client_email]);

  useEffect(() => {
    let cancelled = false;
    api.quotes
      .getEmailDefaults(quote.id)
      .then((defaults) => {
        if (cancelled) return;
        setSubject((prev) => prev || defaults.subject || '');
        setMessage((prev) => prev || defaults.message || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [quote.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api.quotes.sendEmail(quote.id, {
        to: to.trim(),
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
      });
      onSent?.(result.quote);
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
      title="Enviar cotización por correo"
      subtitle={`${quote.numero} — PDF adjunto con plantilla profesional`}
      titleId="send-email-title"
      footer={
        <div className="app-modal-actions">
          {onBack ? (
            <button type="button" className="btn-ghost" onClick={onBack} disabled={busy}>
              Volver
            </button>
          ) : (
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            form="quote-send-email-form"
            className="btn-primary"
            disabled={busy || !to.trim()}
          >
            {busy ? 'Enviando…' : submitLabel}
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}

      <form id="quote-send-email-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="span-2">
          Destinatario *
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="cliente@ejemplo.com"
            required
          />
        </label>
        <label className="span-2">
          Asunto
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`Cotización ${quote.numero}`}
          />
        </label>
        <label className="span-2">
          Mensaje de presentación
          <span className="field-hint muted">
            Opcional. El correo incluye resumen, total, firma y el PDF adjunto.
          </span>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej.: Adjuntamos la cotización solicitada para su revisión…"
          />
        </label>
      </form>
    </AppModal>
  );
}
