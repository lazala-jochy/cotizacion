const { DGII_ANNULMENT_REASONS } = require('../constants');

/** NCF / e-CF: serie alfanumérica + secuencia numérica (hasta 8 dígitos en emisión local). */
function validateNcf(ncf) {
  const raw = String(ncf || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!raw) {
    return { ok: false, error: 'El NCF es obligatorio.' };
  }
  const match = raw.match(/^([A-Z][A-Z0-9]{2,3})(\d{1,11})$/);
  if (!match) {
    return {
      ok: false,
      error: 'NCF inválido. Ejemplo: B0100000126 o E3100000013.',
    };
  }
  return { ok: true, normalized: `${match[1]}${match[2].padStart(8, '0')}`, serie: match[1] };
}

function validateAnnulmentReason(code) {
  const raw = String(code || '').trim();
  const match = raw.match(/^(\d{1,2})/);
  const c = (match ? match[1] : raw).padStart(2, '0');
  const found = DGII_ANNULMENT_REASONS.some((r) => r.code === c);
  if (!found) {
    return { ok: false, error: 'Motivo de anulación inválido (use códigos 01–10).' };
  }
  return { ok: true, code: c };
}

module.exports = { validateNcf, validateAnnulmentReason };
