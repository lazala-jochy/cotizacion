const { cleanDigits } = require('./validateRnc');

/** Validación cédula dominicana (11 dígitos) — algoritmo estándar. */
function validateCedula(cedula) {
  const digits = cleanDigits(cedula);
  if (digits.length !== 11) {
    return { ok: false, error: 'La cédula debe tener 11 dígitos.' };
  }
  const mult = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    let n = Number(digits[i]) * mult[i];
    if (n > 9) n = Math.floor(n / 10) + (n % 10);
    sum += n;
  }
  const check = (10 - (sum % 10)) % 10;
  if (Number(digits[10]) !== check) {
    return { ok: false, error: 'La cédula no es válida.' };
  }
  return { ok: true, normalized: digits };
}

module.exports = { validateCedula };
