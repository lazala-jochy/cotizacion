const ALLOWED_ATTACHMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const MAX_ATTACHMENT_BYTES = 3_000_000;

class ExpenseValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExpenseValidationError';
  }
}

function validateExpensePayload(body, { partial = false } = {}) {
  if (!partial || body.description !== undefined) {
    if (!body.description?.trim()) {
      throw new ExpenseValidationError('La descripción es obligatoria.');
    }
  }
  if (!partial || body.expense_date !== undefined) {
    if (!body.expense_date) throw new ExpenseValidationError('La fecha es obligatoria.');
  }
  if (!partial || body.category_id !== undefined) {
    if (!body.category_id) throw new ExpenseValidationError('La categoría es obligatoria.');
  }
  if (!partial || body.amount !== undefined) {
    const amount = Number(body.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new ExpenseValidationError('El monto debe ser mayor que cero.');
    }
  }
  if (body.attachment_data) {
    const mime = String(body.attachment_mime || '').toLowerCase();
    if (!ALLOWED_ATTACHMENT_MIMES.includes(mime)) {
      throw new ExpenseValidationError('Adjunto no válido. Use PDF, JPG o PNG.');
    }
    if (body.attachment_data.length > MAX_ATTACHMENT_BYTES) {
      throw new ExpenseValidationError('El adjunto supera el tamaño máximo (aprox. 2 MB).');
    }
  }
}

module.exports = {
  ExpenseValidationError,
  validateExpensePayload,
  ALLOWED_ATTACHMENT_MIMES,
  MAX_ATTACHMENT_BYTES,
};
