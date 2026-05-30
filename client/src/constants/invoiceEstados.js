export const INVOICE_ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'anulada', label: 'Anulada' },
];

export const INVOICE_ESTADOS_FILTER = [
  { value: '', label: 'Todos los estados' },
  ...INVOICE_ESTADOS,
];

export const INVOICE_ESTADO_OPTIONS = INVOICE_ESTADOS;

export const INVOICE_ESTADO_HINTS = {
  pendiente: 'Emitida, pendiente de cobro.',
  pagada: 'Cobrada por completo.',
  parcial: 'Hay pagos parciales registrados.',
  vencida: 'Fecha de vencimiento superada.',
  anulada: 'Factura anulada.',
};

export function normalizeInvoiceEstado(value) {
  const v = String(value || 'pendiente').toLowerCase();
  return INVOICE_ESTADOS.some((e) => e.value === v) ? v : 'pendiente';
}

export function invoiceEstadoLabel(value) {
  return INVOICE_ESTADOS.find((e) => e.value === value)?.label || value || '—';
}

export function invoiceEstadoHint(value) {
  return INVOICE_ESTADO_HINTS[normalizeInvoiceEstado(value)] || '';
}

export function canEditInvoice(estado) {
  return estado !== 'anulada';
}
