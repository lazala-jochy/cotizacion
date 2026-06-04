const { validateRnc } = require('./validateRnc');
const { validateCedula } = require('./validateCedula');
const { DGII_ID_TYPES } = require('../constants');

/**
 * Determina tipo de identificación DGII y valor normalizado desde RNC/cédula en cliente.
 */
function resolveBuyerIdentification(clientRnc, documentRequiresTaxId = false) {
  const raw = String(clientRnc || '').trim();
  if (!raw) {
    if (documentRequiresTaxId) {
      return {
        ok: false,
        error: 'Este comprobante requiere RNC o cédula del cliente.',
      };
    }
    return {
      ok: true,
      idType: '',
      idValue: '',
      display: '',
    };
  }

  const rncTry = validateRnc(raw);
  if (rncTry.ok) {
    return {
      ok: true,
      idType: DGII_ID_TYPES.RNC,
      idValue: rncTry.normalized,
      display: rncTry.normalized,
    };
  }

  const cedTry = validateCedula(raw);
  if (cedTry.ok) {
    return {
      ok: true,
      idType: DGII_ID_TYPES.CEDULA,
      idValue: cedTry.normalized,
      display: cedTry.normalized,
    };
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) {
    if (documentRequiresTaxId) {
      return { ok: false, error: 'RNC del cliente inválido.' };
    }
    // B02 y otros sin RNC obligatorio: no bloquear el 607 por un RNC opcional mal digitado
    return { ok: true, idType: '', idValue: '', display: '' };
  }
  if (digits.length === 11) {
    if (documentRequiresTaxId) {
      return { ok: false, error: 'Cédula del cliente inválida.' };
    }
    return { ok: true, idType: '', idValue: '', display: '' };
  }

  return {
    ok: true,
    idType: DGII_ID_TYPES.PASAPORTE,
    idValue: raw.slice(0, 20),
    display: raw,
  };
}

module.exports = { resolveBuyerIdentification };
