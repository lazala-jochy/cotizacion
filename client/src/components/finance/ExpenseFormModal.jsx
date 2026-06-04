import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import AppModal from '../AppModal';
import ExpenseAttachmentField from './ExpenseAttachmentField';
import { getAttachmentSource } from '../../utils/expenseAttachment';
import { formatItbisInput, splitAmountWithItbis } from '../../utils/expenseItbis';

const EMPTY_DEFAULTS = {};

const emptyForm = {
  expense_date: new Date().toISOString().slice(0, 10),
  category_id: '',
  description: '',
  amount: '',
  itbis: '',
  payment_method: 'Efectivo',
  reference_number: '',
  notes: '',
  rnc: '',
  ncf: '',
  quote_id: null,
  invoice_id: null,
  client_id: null,
};

export default function ExpenseFormModal({ open, onClose, onSaved, expense, defaults = EMPTY_DEFAULTS }) {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [clearAttachment, setClearAttachment] = useState(false);
  const itbisManualRef = useRef(false);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  useEffect(() => {
    if (!open) return;
    Promise.all([api.expenses.categories(), api.expenses.meta()])
      .then(([cats, meta]) => {
        setCategories(cats);
        setPaymentMethods(meta.paymentMethods || []);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const d = defaultsRef.current;
    itbisManualRef.current = false;
    if (expense) {
      itbisManualRef.current = expense.itbis != null && expense.itbis !== '';
      setForm({
        expense_date: expense.expense_date,
        category_id: String(expense.category_id),
        description: expense.description,
        amount: String(expense.amount),
        itbis: formatItbisInput(expense.amount, expense.itbis),
        payment_method: expense.payment_method || 'Efectivo',
        reference_number: expense.reference_number || '',
        notes: expense.notes || '',
        rnc: expense.rnc || '',
        ncf: expense.ncf || '',
        quote_id: expense.quote_id,
        invoice_id: expense.invoice_id,
        client_id: expense.client_id,
      });
    } else {
      setForm({
        ...emptyForm,
        expense_date: new Date().toISOString().slice(0, 10),
        rnc: d.rnc ?? '',
        ncf: d.ncf ?? '',
        quote_id: d.quote_id ?? null,
        invoice_id: d.invoice_id ?? null,
        client_id: d.client_id ?? null,
        category_id: '',
      });
    }
    setAttachment(null);
    setClearAttachment(false);
    if (expense && getAttachmentSource(expense)) {
      setExistingAttachment({
        attachment_name: expense.attachment_name,
        attachment_mime: expense.attachment_mime,
        attachment_data: expense.attachment_data,
      });
    } else {
      setExistingAttachment(null);
    }
    setError('');
  }, [open, expense?.id]);

  const handleAmountChange = (value) => {
    if (!itbisManualRef.current) {
      const { itbis } = splitAmountWithItbis(value);
      setForm((prev) => ({ ...prev, amount: value, itbis: value ? String(itbis) : '' }));
    } else {
      setForm((prev) => ({ ...prev, amount: value }));
    }
  };

  const handleItbisChange = (value) => {
    itbisManualRef.current = true;
    setForm((prev) => ({ ...prev, itbis: value }));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Use PDF, JPG o PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Archivo demasiado grande (máx. 2 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        attachment_name: file.name,
        attachment_mime: file.type,
        attachment_data: reader.result,
      });
      setClearAttachment(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const amount = Number(form.amount);
      let itbisVal = form.itbis !== '' ? Number(form.itbis) : null;
      if (itbisVal == null || Number.isNaN(itbisVal)) {
        itbisVal = splitAmountWithItbis(amount).itbis;
      }
      const body = {
        ...form,
        category_id: Number(form.category_id),
        amount,
        itbis: itbisVal,
        rnc: form.rnc.trim() || null,
        ncf: form.ncf.trim() || null,
        quote_id: form.quote_id || null,
        invoice_id: form.invoice_id || null,
        client_id: form.client_id || null,
        project_id: expense?.project_id ?? null,
        ...(attachment || {}),
        clear_attachment: clearAttachment,
      };
      if (expense?.id) {
        await api.expenses.update(expense.id, body);
      } else {
        await api.expenses.create(body);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={() => !busy && onClose()}
      title={expense ? 'Editar gasto' : 'Registrar gasto'}
      size="md"
      footer={
        <div className="app-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="expense-form" className="btn-primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form id="expense-form" className="form-grid" onSubmit={handleSubmit}>
        <label>
          RNC
          <input
            value={form.rnc}
            onChange={(e) => setForm({ ...form, rnc: e.target.value })}
            placeholder="Ej. 101234567"
            autoComplete="off"
          />
        </label>
        <label>
          NCF
          <input
            value={form.ncf}
            onChange={(e) => setForm({ ...form, ncf: e.target.value.toUpperCase() })}
            placeholder="Ej. B0100000126"
            autoComplete="off"
          />
        </label>
        <label className="span-2">
          Descripción
          <input
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Categoría
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha
          <input
            type="date"
            required
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          />
        </label>
        <label>
          Monto total (RD$)
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
          />
        </label>
        <label>
          ITBIS (RD$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.itbis}
            onChange={(e) => handleItbisChange(e.target.value)}
          />
        </label>
        <label>
          Método de pago
          <select
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
          >
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          Referencia
          <input
            value={form.reference_number}
            onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
          />
        </label>
        <ExpenseAttachmentField
          attachment={attachment}
          existing={clearAttachment ? null : existingAttachment}
          onFileChange={handleFile}
          onClear={() => {
            setAttachment(null);
            setExistingAttachment(null);
            setClearAttachment(true);
          }}
        />
        <label className="span-2">
          Notas
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
      </form>
    </AppModal>
  );
}
