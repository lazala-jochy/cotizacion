/**
 * Formato fiscal: serie + secuencia con 9 dígitos (ej. B02 + 000000126 → B02000000126).
 */
function formatFiscalNumber(serie, secuencia) {
  const s = String(serie || '').trim().toUpperCase();
  const seq = Math.max(0, Math.floor(Number(secuencia) || 0));
  return `${s}${String(seq).padStart(9, '0')}`;
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
    if (/^\d{1,9}$/.test(tail)) {
      const secuencia = parseInt(tail, 10);
      return {
        serie: serieHint,
        secuencia,
        fiscal_number: formatFiscalNumber(serieHint, secuencia),
      };
    }
  }

  const match = raw.match(/^([A-Z][A-Z0-9]*?)(\d{1,9})$/);
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
  formatFiscalNumber,
  parseSerieFromFiscalNumber,
  parseFiscalNumber,
};
