import { useState } from 'react';
import { api } from '../api';
import {
  QUOTE_ESTADO_OPTIONS,
  WORKFLOW_ORDER,
  quoteEstadoHint,
  quoteEstadoLabel,
  normalizeEstado,
  canRegisterPayments,
  shouldPromptSendOnEnviada,
} from '../constants/quoteEstados';
import { formatMoney } from '../utils/quoteFinancial';
import QuotePaymentForm from './QuotePaymentForm';
import QuoteEnviadaModal from './QuoteEnviadaModal';

export default function QuoteWorkflow({ quote, onUpdate }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [estadoSel, setEstadoSel] = useState(normalizeEstado(quote.estado));
  const [enviadaModalOpen, setEnviadaModalOpen] = useState(false);

  const estado = normalizeEstado(quote.estado);
  const balance = Number(quote.balance_pendiente) || 0;
  const canAddPayment = canRegisterPayments(estado) && balance > 0.009;

  const applyEstadoChange = async (newEstado) => {
    setBusy(true);
    setError('');
    try {
      const updated = await api.quotes.setEstado(quote.id, newEstado);
      onUpdate(updated);
      setEstadoSel(normalizeEstado(updated.estado));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEstadoChange = (newEstado) => {
    if (shouldPromptSendOnEnviada(newEstado, estado)) {
      setEnviadaModalOpen(true);
      return;
    }
    applyEstadoChange(newEstado);
  };

  const handleAdvance = () => {
    if (quote.siguiente_estado) handleEstadoChange(quote.siguiente_estado);
  };

  const handleApplyEstado = (e) => {
    e.preventDefault();
    if (estadoSel !== estado) handleEstadoChange(estadoSel);
  };

  const handleEnviadaModalClose = () => {
    setEnviadaModalOpen(false);
    setEstadoSel(estado);
  };

  const handleEnviadaUpdated = (updated) => {
    onUpdate(updated);
    setEstadoSel(normalizeEstado(updated.estado));
    setEnviadaModalOpen(false);
  };

  const handleAddPayment = async (payload) => {
    setPaymentBusy(true);
    setPaymentError('');
    try {
      const { quote: updated } = await api.quotes.addPayment(quote.id, payload);
      onUpdate(updated);
      setEstadoSel(normalizeEstado(updated.estado));
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('¿Eliminar este pago del historial?')) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.quotes.removePayment(quote.id, paymentId);
      onUpdate(updated);
      setEstadoSel(normalizeEstado(updated.estado));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="quote-workflow no-print">
      {enviadaModalOpen && (
        <QuoteEnviadaModal
          quote={quote}
          onClose={handleEnviadaModalClose}
          onUpdated={handleEnviadaUpdated}
        />
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel workflow-panel">
        <h2>Seguimiento del proceso</h2>
        <div className="workflow-current">
          <span className={`badge badge-${estado}`}>{quoteEstadoLabel(estado)}</span>
          <p className="workflow-hint">{quoteEstadoHint(estado)}</p>
        </div>

        <div className="workflow-steps" aria-label="Flujo de estados">
          {WORKFLOW_ORDER.filter((s) => s !== 'pago_parcial').map((step) => {
            const idx = WORKFLOW_ORDER.indexOf(estado);
            const stepIdx = WORKFLOW_ORDER.indexOf(step);
            const done = stepIdx < idx || estado === 'pagada';
            const active = step === estado || (estado === 'pago_parcial' && step === 'completada');
            return (
              <div
                key={step}
                className={`workflow-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
                title={quoteEstadoLabel(step)}
              >
                <span className="workflow-step-dot" />
                <span className="workflow-step-label">{quoteEstadoLabel(step)}</span>
              </div>
            );
          })}
        </div>

        <div className="workflow-actions">
          {quote.siguiente_estado && estado !== 'cancelada' && (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy}
              onClick={handleAdvance}
            >
              Avanzar a: {quoteEstadoLabel(quote.siguiente_estado)}
            </button>
          )}
          {estado !== 'cancelada' && estado !== 'pagada' && (
            <button
              type="button"
              className="btn-ghost btn-sm danger"
              disabled={busy}
              onClick={() => handleEstadoChange('cancelada')}
            >
              Cancelar cotización
            </button>
          )}
        </div>

        <form className="workflow-estado-form" onSubmit={handleApplyEstado}>
          <label>
            Cambiar estado manualmente
            <select
              value={estadoSel}
              onChange={(e) => setEstadoSel(e.target.value)}
              disabled={busy || estado === 'pagada'}
            >
              {QUOTE_ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-ghost btn-sm" disabled={busy || estadoSel === estado}>
            Aplicar
          </button>
        </form>
      </section>

      <section className="panel financial-panel">
        <h2>Control financiero</h2>
        <div className="financial-summary">
          <div className="financial-stat">
            <span className="financial-stat-label">Total cotización</span>
            <strong>{formatMoney(quote.total)}</strong>
          </div>
          <div className="financial-stat financial-stat--paid">
            <span className="financial-stat-label">Pagado</span>
            <strong>{formatMoney(quote.monto_pagado)}</strong>
          </div>
          <div className="financial-stat financial-stat--pending">
            <span className="financial-stat-label">Pendiente</span>
            <strong>{formatMoney(balance)}</strong>
          </div>
        </div>

        {quote.payments?.length > 0 && (
          <div className="payments-history">
            <h3>Historial de pagos</h3>
            <table className="data-table payments-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th className="col-num">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quote.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.fecha}</td>
                    <td>{p.metodo || '—'}</td>
                    <td>{p.referencia || '—'}</td>
                    <td className="col-num">
                      <strong>{formatMoney(p.monto)}</strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost btn-sm danger"
                        disabled={busy}
                        onClick={() => handleDeletePayment(p.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {estado === 'pago_parcial' && canAddPayment && (
          <div className="alert alert-warn payment-phase-alert">
            Estado <strong>Pago parcial</strong>: registra el monto recibido abajo. El pendiente se
            actualiza solo.
          </div>
        )}

        {canAddPayment && (
          <QuotePaymentForm
            quote={quote}
            onSubmit={handleAddPayment}
            busy={paymentBusy}
            error={paymentError}
            title="Registrar pago"
            showSummary={false}
          />
        )}

        {estado === 'pagada' && (
          <p className="alert alert-success workflow-paid-msg">Cotización pagada por completo.</p>
        )}
      </section>
    </div>
  );
}
