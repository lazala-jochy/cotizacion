/** Validación RNC dominicano (9 dígitos) con dígito verificador módulo 11. */
function cleanDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function validateRnc(rnc) {
  const digits = cleanDigits(rnc);
  if (digits.length !== 9) {
    return { ok: false, error: 'El RNC debe tener 9 dígitos.' };
  }
  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i += 1) {
    sum += Number(digits[i]) * weights[i];
  }
  const mod = sum % 11;
  const check = mod === 0 ? 2 : mod === 1 ? 1 : 11 - mod;
  if (Number(digits[8]) !== check) {
    return { ok: false, error: 'El RNC no es válido (dígito verificador incorrecto).' };
  }
  return { ok: true, normalized: digits };
}

module.exports = { validateRnc, cleanDigits };
