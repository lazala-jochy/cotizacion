const { formatFiscalNumber } = require('./fiscalNumber');

const RANGE_EXHAUSTED_MSG =
  'El rango fiscal autorizado ha sido agotado. Debe registrar un nuevo rango antes de emitir más facturas.';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function validateFiscalRangeForIssue(range) {
  if (!range) {
    return { ok: false, error: 'No hay un rango fiscal activo. Configure Facturación fiscal en Empresa.' };
  }
  if (range.estado !== 'activo') {
    return { ok: false, error: 'El rango fiscal seleccionado no está activo.' };
  }
  if (range.fecha_vencimiento && range.fecha_vencimiento < todayIsoDate()) {
    return { ok: false, error: 'El rango fiscal está vencido. Registre un nuevo rango activo.' };
  }
  const next = range.ultimo_numero_utilizado + 1;
  if (next > range.numero_final) {
    return { ok: false, error: RANGE_EXHAUSTED_MSG };
  }
  if (next < range.numero_inicial) {
    return { ok: false, error: 'El contador fiscal está por debajo del número inicial autorizado.' };
  }
  return { ok: true, nextSecuencia: next };
}

function validateActiveRangeBase(range) {
  if (!range) {
    return { ok: false, error: 'No hay un rango fiscal activo. Configure Facturación fiscal en Empresa.' };
  }
  if (range.estado !== 'activo') {
    return { ok: false, error: 'El rango fiscal seleccionado no está activo.' };
  }
  if (range.fecha_vencimiento && range.fecha_vencimiento < todayIsoDate()) {
    return { ok: false, error: 'El rango fiscal está vencido. Registre un nuevo rango activo.' };
  }
  return { ok: true };
}

function validateSecuenciaInRange(range, secuencia) {
  const seq = Math.floor(Number(secuencia) || 0);
  if (seq < range.numero_inicial || seq > range.numero_final) {
    return {
      ok: false,
      error: `El número debe estar entre ${formatFiscalNumber(range.serie, range.numero_inicial)} y ${formatFiscalNumber(range.serie, range.numero_final)}.`,
    };
  }
  return { ok: true, secuencia: seq };
}

function validateRangePayload(data) {
  const inicial = Number(data.numero_inicial);
  const final = Number(data.numero_final);
  if (!data.serie?.trim()) return 'La serie es requerida';
  if (!Number.isInteger(inicial) || inicial < 0) return 'Número inicial inválido';
  if (!Number.isInteger(final) || final < inicial) {
    return 'El número final debe ser mayor o igual al inicial';
  }
  const ultimo = Number(data.ultimo_numero_utilizado ?? inicial - 1);
  if (ultimo < inicial - 1 || ultimo > final) {
    return 'Último número utilizado fuera del rango autorizado';
  }
  return null;
}

module.exports = {
  validateFiscalRangeForIssue,
  validateActiveRangeBase,
  validateSecuenciaInRange,
  validateRangePayload,
  RANGE_EXHAUSTED_MSG,
  formatFiscalNumber,
};
