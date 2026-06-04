import { MONTH_FILTER_OPTIONS } from './quoteListFilters';

export { MONTH_FILTER_OPTIONS };

export function getDefaultYearMonth() {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
  };
}

export function buildYearOptions({ minYear, maxYear, includeAll = true } = {}) {
  const current = new Date().getFullYear();
  const end = maxYear ?? current;
  const start = minYear ?? current - 5;
  const years = includeAll ? [{ value: '', label: 'Todos' }] : [];
  for (let y = end; y >= start; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export function getYearOptionsFromItems(items, dateAccessor) {
  const current = new Date().getFullYear();
  let minYear = current;
  for (const item of items) {
    const raw = dateAccessor(item);
    if (!raw) continue;
    const iso = String(raw).includes('T') ? raw : `${raw}T12:00:00`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) minYear = Math.min(minYear, d.getFullYear());
  }
  return buildYearOptions({ minYear, maxYear: current });
}

/** Convierte año/mes a rango YYYY-MM-DD. Sin mes = año completo. Sin año = sin rango. */
export function dateRangeFromYearMonth(year, month) {
  if (!year) return { from: '', to: '' };
  const y = Number(year);
  if (month) {
    const m = Number(month) - 1;
    const last = new Date(y, m + 1, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return {
      from: `${y}-${month}-01`,
      to: `${y}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
    };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

/** Rango para ingresos/gastos en Reportes (alineado a filtros de cotizaciones). */
export function getReportFinanceRange(months, year, month) {
  const today = new Date().toISOString().slice(0, 10);
  let range = dateRangeFromYearMonth(year, month);

  if (!year && !month) {
    if (months > 0) {
      const cutoff = new Date();
      cutoff.setHours(12, 0, 0, 0);
      cutoff.setMonth(cutoff.getMonth() - months);
      range = { from: cutoff.toISOString().slice(0, 10), to: today };
    } else {
      range = { from: '2000-01-01', to: today };
    }
  } else if (months > 0 && range.from) {
    const cutoff = new Date();
    cutoff.setHours(12, 0, 0, 0);
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    if (range.from < cutoffStr) range = { ...range, from: cutoffStr };
    if (!range.to) range.to = today;
  }

  return range;
}

export function parseFilterDate(dateStr) {
  if (!dateStr) return null;
  const iso = String(dateStr).includes('T') ? dateStr : `${dateStr}T12:00:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function matchesYearMonth(dateStr, year, month) {
  if (!year && !month) return true;
  const d = parseFilterDate(dateStr);
  if (!d) return false;
  if (year && d.getFullYear() !== Number(year)) return false;
  if (month) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    if (m !== month) return false;
  }
  return true;
}

/** Período DGII en formato AAAAMM */
export function matchesDgiiPeriod(period, year, month) {
  if (!year && !month) return true;
  const p = String(period || '');
  if (p.length < 6) return false;
  if (year && p.slice(0, 4) !== year) return false;
  if (month && p.slice(4, 6) !== month) return false;
  return true;
}
