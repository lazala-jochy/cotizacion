/** Longitud fija de la parte secuencial del NCF / e-CF (después del código de tipo). */
const FISCAL_SEQUENCE_DIGITS = 8;

/**
 * Formato fiscal: código de tipo + secuencia con 8 dígitos.
 * Ej.: B01 + 126 → B0100000126, E35 + 301 → E3500000301
 */
function formatFiscalNumber(serie, secuencia) {
  const s = String(serie || '').trim().toUpperCase();
  const seq = Math.max(0, Math.floor(Number(secuencia) || 0));
  return `${s}${String(seq).padStart(FISCAL_SEQUENCE_DIGITS, '0')}`;
}

function parseSerieFromFiscalNumber(fiscalNumber, serie) {
  const parsed = parseFiscalNumber(fiscalNumber, serie);
  return parsed ? parsed.secuencia : null;
}

/**
 * Interpreta NCF: serie + secuencia (9 dígitos). Usa serie del rango activo si coincide el prefijo.
 */
function parseFiscalNumber(fiscalNumber, defaultSerie) {
  const raw = String(fiscalNumber || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!raw) return null;

  const serieHint = String(defaultSerie || '')
    .trim()
    .toUpperCase();
  if (serieHint && raw.startsWith(serieHint)) {
    const tail = raw.slice(serieHint.length);
    if (/^\d{1,8}$/.test(tail)) {
      const secuencia = parseInt(tail, 10);
      return {
        serie: serieHint,
        secuencia,
        fiscal_number: formatFiscalNumber(serieHint, secuencia),
      };
    }
  }

  const match = raw.match(/^([A-Z][A-Z0-9]*?)(\d{1,8})$/);
  if (!match) return null;
  const serie = match[1];
  const secuencia = parseInt(match[2], 10);
  if (!serie || Number.isNaN(secuencia)) return null;
  return {
    serie,
    secuencia,
    fiscal_number: formatFiscalNumber(serie, secuencia),
  };
}

module.exports = {
  FISCAL_SEQUENCE_DIGITS,
  formatFiscalNumber,
  parseSerieFromFiscalNumber,
  parseFiscalNumber,
};
