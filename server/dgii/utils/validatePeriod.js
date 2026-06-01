function validatePeriod(period) {
  const p = String(period || '').trim();
  if (!/^\d{6}$/.test(p)) {
    return { ok: false, error: 'El período debe tener formato AAAAMM (ej. 202605).' };
  }
  const year = Number(p.slice(0, 4));
  const month = Number(p.slice(4, 6));
  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return { ok: false, error: 'Período fiscal inválido.' };
  }
  return { ok: true, period: p, year, month };
}

function periodDateRange(period) {
  const { year, month } = validatePeriod(period);
  if (!year) throw new Error('Período inválido');
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

module.exports = { validatePeriod, periodDateRange };
