/** Flujo de cotización y control de pagos */

const ESTADOS = [
  'creada',
  'enviada',
  'aprobada',
  'en_proceso',
  'completada',
  'pago_parcial',
  'pagada',
  'cancelada',
];

const ESTADO_LABELS = {
  creada: 'Creada',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  pago_parcial: 'Pago parcial',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
};

const LEGACY_MAP = {
  borrador: 'creada',
  aceptada: 'aprobada',
  pendiente: 'pago_parcial',
  rechazada: 'cancelada',
  pagada: 'pagada',
  enviada: 'enviada',
};

const WORKFLOW_ORDER = [
  'creada',
  'enviada',
  'aprobada',
  'en_proceso',
  'completada',
  'pago_parcial',
  'pagada',
];

function normalizeEstado(estado) {
  if (!estado) return 'creada';
  return LEGACY_MAP[estado] || (ESTADOS.includes(estado) ? estado : 'creada');
}

function canEditQuote(estado) {
  return normalizeEstado(estado) === 'creada';
}

function sumPayments(payments) {
  return (payments || []).reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Calcula monto pagado, balance y estado financiero sugerido */
function computeFinancials(quote, payments) {
  const total = roundMoney(quote.total);
  const montoPagado = roundMoney(sumPayments(payments));
  const balancePendiente = roundMoney(Math.max(0, total - montoPagado));
  const pagadaCompleta = balancePendiente <= 0.009 && total > 0;
  const tienePagos = montoPagado > 0.009;

  return {
    total,
    monto_pagado: montoPagado,
    balance_pendiente: balancePendiente,
    pagada_completa: pagadaCompleta,
    tiene_pagos: tienePagos,
  };
}

/** Ajusta estado según pagos (no toca cancelada) */
function syncEstadoFromPayments(estado, financials) {
  const e = normalizeEstado(estado);
  if (e === 'cancelada') return e;
  if (financials.pagada_completa) return 'pagada';
  if (financials.tiene_pagos) return 'pago_parcial';
  // Mantener "pago parcial" aunque aún no haya pagos (el usuario registrará después)
  if (e === 'pago_parcial') return e;
  return e;
}

function enrichQuote(quote, payments) {
  const estado = normalizeEstado(quote.estado);
  const financials = computeFinancials(quote, payments);
  const estadoEfectivo = syncEstadoFromPayments(estado, financials);

  return {
    ...quote,
    estado: estadoEfectivo,
    estado_guardado: estado,
    payments: payments || [],
    ...financials,
    puede_editar: canEditQuote(estadoEfectivo),
    siguiente_estado: getNextEstado(estadoEfectivo, financials),
  };
}

function getNextEstado(estado, financials) {
  const e = normalizeEstado(estado);
  if (e === 'cancelada' || e === 'pagada') return null;
  if (financials?.pagada_completa) return 'pagada';
  const idx = WORKFLOW_ORDER.indexOf(e);
  if (idx < 0 || idx >= WORKFLOW_ORDER.length - 1) return null;
  const next = WORKFLOW_ORDER[idx + 1];
  if (next === 'pago_parcial') return null; // lo manejan los pagos
  return next;
}

function validateEstado(estado) {
  const e = normalizeEstado(estado);
  if (!ESTADOS.includes(e)) {
    return { ok: false, error: 'Estado no válido' };
  }
  return { ok: true, estado: e };
}

function migrateLegacyEstados(db) {
  const rows = db.prepare('SELECT id, estado FROM quotes').all();
  const upd = db.prepare('UPDATE quotes SET estado = ? WHERE id = ?');
  for (const row of rows) {
    const next = normalizeEstado(row.estado);
    if (next !== row.estado) upd.run(next, row.id);
  }
}

module.exports = {
  ESTADOS,
  ESTADO_LABELS,
  normalizeEstado,
  canEditQuote,
  sumPayments,
  computeFinancials,
  syncEstadoFromPayments,
  enrichQuote,
  getNextEstado,
  validateEstado,
  migrateLegacyEstados,
};
