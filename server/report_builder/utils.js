function normHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugKey(label, used) {
  let base = normHeader(label)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'columna';
  let key = base;
  let i = 2;
  while (used.has(key)) {
    key = `${base}_${i}`;
    i += 1;
  }
  used.add(key);
  return key;
}

function parseNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/%$/.test(raw)) {
    const n = parseNumber(raw.replace(/%/g, ''));
    return n == null ? null : n / 100;
  }
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/,(?=\d{3}\b)/g, '');
  const normalized = cleaned.includes(',') && !cleaned.includes('.')
    ? cleaned.replace(',', '.')
    : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function isDateLike(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return true;
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s)) return true;
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && /[\/\-]/.test(s);
}

function parseDate(value) {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = {
  normHeader,
  slugKey,
  parseNumber,
  isDateLike,
  parseDate,
};
