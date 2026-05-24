export const QUOTE_ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'creada', label: 'Creada' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completada', label: 'Completada' },
  { value: 'pago_parcial', label: 'Pago parcial' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'cancelada', label: 'Cancelada' },
];

export const QUOTE_ESTADO_OPTIONS = QUOTE_ESTADOS.filter((e) => e.value);

export const QUOTE_ESTADO_LABELS = {
  creada: 'Creada',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  pago_parcial: 'Pago parcial',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
  borrador: 'Creada',
  aceptada: 'Aprobada',
  pendiente: 'Pago parcial',
  rechazada: 'Cancelada',
};

export const QUOTE_ESTADO_HINTS = {
  creada: 'Recién creada, aún editable. No ha sido enviada al cliente.',
  enviada: 'Enviada al cliente para revisión.',
  aprobada: 'El cliente aceptó. Trabajo confirmado.',
  en_proceso: 'El servicio o trabajo está en curso.',
  completada: 'Trabajo terminado. Puede estar pendiente de cobro.',
  pago_parcial: 'Hay pagos registrados pero aún falta saldo.',
  pagada: 'Cobrada por completo. Cerrada financieramente.',
  cancelada: 'Cancelada. No continúa el flujo.',
};

export const WORKFLOW_ORDER = [
  'creada',
  'enviada',
  'aprobada',
  'en_proceso',
  'completada',
  'pago_parcial',
  'pagada',
];

export function normalizeEstado(estado) {
  const legacy = {
    borrador: 'creada',
    aceptada: 'aprobada',
    pendiente: 'pago_parcial',
    rechazada: 'cancelada',
  };
  return legacy[estado] || estado || 'creada';
}

export function quoteEstadoLabel(estado) {
  return QUOTE_ESTADO_LABELS[normalizeEstado(estado)] || estado;
}

export function quoteEstadoHint(estado) {
  return QUOTE_ESTADO_HINTS[normalizeEstado(estado)] || '';
}

export function canEditQuoteContent(estado) {
  return normalizeEstado(estado) === 'creada';
}

const PAYMENT_PHASE_ESTADOS = ['aprobada', 'en_proceso', 'completada', 'pago_parcial'];

export function isPaymentPhase(estado) {
  return PAYMENT_PHASE_ESTADOS.includes(normalizeEstado(estado));
}

export function canRegisterPayments(estado) {
  const e = normalizeEstado(estado);
  return !['creada', 'enviada', 'cancelada'].includes(e);
}

export function shouldPromptPayment(estado, balancePendiente) {
  return isPaymentPhase(estado) && (Number(balancePendiente) || 0) > 0.009;
}
