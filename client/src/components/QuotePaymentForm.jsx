import { useEffect, useState } from 'react';
import { formatMoney } from '../utils/quoteFinancial';
import { normalizeEstado, quoteEstadoLabel } from '../constants/quoteEstados';

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta', 'Otro'];

export default function QuotePaymentForm({
  quote,
  onSubmit,
  busy = false,
  error = '',
  onCancel,
  title = 'Registrar pago',
  showSummary = true,
}) {
  const balance = Number(quote.balance_pendiente) || 0;
  const [form, setForm] = useState({
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    metodo: 'Transferencia',
    referencia: '',
    notas: '',
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      monto: balance > 0 ? String(balance) : '',
    }));
  }, [quote.id, balance]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      monto: Number(form.monto),
      fecha: form.fecha,
      metodo: form.metodo,
      referencia: form.referencia,
      notas: form.notas,
    });
  };

  const fillFullBalance = () => {
    setForm((f) => ({ ...f, monto: String(balance) }));
  };

  if (balance <= 0.009) {
    return (
      <p className="alert alert-success" style={{ margin: 0 }}>
        Esta cotización no tiene saldo pendiente.
      </p>
    );
  }

  return (
    <div className="quote-payment-form-wrap">
      {error && <div className="alert alert-error">{error}</div>}

      {showSummary && (
        <div className="payment-form-summary">
          <div>
            <span className="muted">Total</span>
            <strong>{formatMoney(quote.total)}</strong>
          </div>
          <div>
            <span className="muted">Pagado</span>
            <strong className="text-paid">{formatMoney(quote.monto_pagado)}</strong>
          </div>
          <div>
            <span className="muted">Pendiente</span>
            <strong className="text-pending">{formatMoney(balance)}</strong>
          </div>
          {quote.estado && (
            <div>
              <span className="muted">Estado</span>
              <span className={`badge badge-${normalizeEstado(quote.estado)}`}>
                {quoteEstadoLabel(quote.estado)}
              </span>
            </div>
          )}
        </div>
      )}

      <form className="payment-form form-grid" onSubmit={handleSubmit}>
        <h3>{title}</h3>
        <label className="span-2">
          Monto del pago *
          <div className="payment-monto-row">
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={balance}
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              required
            />
            <button type="button" className="btn-ghost btn-sm" onClick={fillFullBalance}>
              Todo el pendiente ({formatMoney(balance)})
            </button>
          </div>
        </label>
        <label>
          Fecha
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            required
          />
        </label>
        <label>
          Método
          <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}>
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          Referencia
          <input
            value={form.referencia}
            onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            placeholder="No. transferencia, cheque…"
          />
        </label>
        <label className="span-2">
          Notas
          <input
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </label>
        <div className="payment-form-actions span-2">
          {onCancel && (
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={busy}>
            Registrar pago
          </button>
        </div>
      </form>
      <p className="payment-form-hint muted">
        El pendiente se recalcula automáticamente. Si el pago cubre el total, el estado pasará a{' '}
        <strong>Pagada</strong>; si es parcial, quedará en <strong>Pago parcial</strong>.
      </p>
    </div>
  );
}
