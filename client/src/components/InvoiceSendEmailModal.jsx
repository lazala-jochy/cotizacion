import { useEffect, useState } from 'react';
import { api } from '../api';
import AppModal from './AppModal';

export default function InvoiceSendEmailModal({ invoice, onClose, onSent }) {
  const [to, setTo] = useState(invoice.client_email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTo(invoice.client_email || '');
  }, [invoice.client_email]);

  useEffect(() => {
    let cancelled = false;
    api.invoices
      .getEmailDefaults(invoice.id)
      .then((defaults) => {
        if (cancelled) return;
        setSubject((prev) => prev || defaults.subject || '');
        setMessage((prev) => prev || defaults.message || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [invoice.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api.invoices.sendEmail(invoice.id, {
        to: to.trim(),
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
      });
      onSent?.(result.invoice);
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
      title="Enviar factura por correo"
      subtitle={`${invoice.fiscal_number} — PDF adjunto`}
      titleId="invoice-send-email-title"
      footer={
        <div className="app-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            form="invoice-send-email-form"
            className="btn-primary"
            disabled={busy || !to.trim()}
          >
            {busy ? 'Enviando…' : 'Enviar correo'}
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form id="invoice-send-email-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="span-2">
          Destinatario *
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <label className="span-2">
          Asunto
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="span-2">
          Mensaje
          <span className="field-hint muted">Opcional. Se adjunta el PDF de la factura.</span>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
      </form>
    </AppModal>
  );
}
