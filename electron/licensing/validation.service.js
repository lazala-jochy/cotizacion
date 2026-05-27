const { stableStringify, verifySignature, aes256GcmDecrypt } = require('./crypto.service');
const { normalizeMachineIdForCompare } = require('./machine.service');

const REQUIRED_FIELDS = ['company', 'machineId', 'issuedAt', 'expiresAt', 'plan', 'features'];

function buildSignedEnvelopeString(envelope) {
  const { v, iv, data, tag } = envelope;
  return stableStringify({ v, iv, data, tag });
}

/**
 * Valida archivo .lic: firma RSA, integridad del sobre, descifrado AES-GCM (ligado al Machine ID),
 * coincidencia de machineId y expiración.
 */
function validateLicenseFileContent(rawText, currentMachineId) {
  const text = String(rawText || '').trim();
  if (!text) throw new Error('Archivo de licencia vacío');

  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error('Formato de licencia inválido (no es JSON válido)');
  }

  if (!envelope || typeof envelope !== 'object') throw new Error('Licencia inválida');

  const { v, iv, data, tag, signature } = envelope;
  if (v !== 1) throw new Error('Versión de licencia no soportada');
  if (!iv || !data || !tag || !signature) throw new Error('Licencia incompleta o corrupta');

  const signInput = buildSignedEnvelopeString({ v, iv, data, tag });
  if (!verifySignature(signInput, signature)) {
    throw new Error('Firma digital inválida o licencia alterada');
  }

  let innerText;
  try {
    innerText = aes256GcmDecrypt({ ivHex: iv, dataB64: data, tagB64: tag }, currentMachineId);
  } catch {
    throw new Error('No se pudo descifrar la licencia. Verifica que el Machine ID coincida con el usado al emitir el archivo.');
  }

  let payload;
  try {
    payload = JSON.parse(innerText);
  } catch {
    throw new Error('Contenido interno de licencia corrupto');
  }

  const missing = REQUIRED_FIELDS.filter((k) => payload[k] === undefined || payload[k] === null);
  if (missing.length) throw new Error(`Licencia incompleta: faltan ${missing.join(', ')}`);
  if (!Array.isArray(payload.features)) throw new Error('Campo features inválido');

  const expected = normalizeMachineIdForCompare(payload.machineId);
  const actual = normalizeMachineIdForCompare(currentMachineId);
  if (!expected || !actual || expected !== actual) {
    throw new Error('Esta licencia no corresponde a este equipo');
  }

  const expires = new Date(`${payload.expiresAt}T23:59:59`);
  if (Number.isNaN(expires.getTime())) throw new Error('Fecha de expiración inválida');
  if (expires < new Date()) throw new Error('La licencia ha expirado');

  return payload;
}

module.exports = {
  validateLicenseFileContent,
  buildSignedEnvelopeString,
};
