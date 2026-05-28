import { parseQuoteDate } from './reportStats';

export const MONTO_FILTER_OPTIONS = [
  { value: '', label: 'Cualquier monto' },
  { value: 'lte:10000', label: 'Hasta RD$ 10,000' },
  { value: '10000-50000', label: 'RD$ 10,000 – 50,000' },
  { value: '50000-100000', label: 'RD$ 50,000 – 100,000' },
  { value: 'gte:100000', label: 'Más de RD$ 100,000' },
];

export const MONTH_FILTER_OPTIONS = [
  { value: '', label: 'Todos los meses' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export function getFilterYearOptions(quotes) {
  const current = new Date().getFullYear();
  let minYear = current;
  for (const q of quotes) {
    const d = parseQuoteDate(q.fecha);
    if (d) minYear = Math.min(minYear, d.getFullYear());
  }
  const years = [];
  for (let y = current; y >= minYear; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

function matchesMontoRange(total, montoFilter) {
  if (!montoFilter) return true;
  const amount = Number(total) || 0;
  if (montoFilter.startsWith('lte:')) {
    return amount <= Number(montoFilter.slice(4));
  }
  if (montoFilter.startsWith('gte:')) {
    return amount >= Number(montoFilter.slice(4));
  }
  const [min, max] = montoFilter.split('-').map(Number);
  return amount >= min && amount <= max;
}

export function quoteMatchesListFilters(
  quote,
  { yearFilter, monthFilter, montoFilter, estadoFilter, search, normalizeEstado }
) {
  if (estadoFilter && normalizeEstado(quote.estado) !== estadoFilter) return false;

  if (yearFilter || monthFilter) {
    const d = parseQuoteDate(quote.fecha);
    if (!d) return false;
    if (yearFilter && d.getFullYear() !== Number(yearFilter)) return false;
    if (monthFilter) {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      if (m !== monthFilter) return false;
    }
  }

  if (!matchesMontoRange(quote.total, montoFilter)) return false;

  const q = search.trim().toLowerCase();
  if (q) {
    const haystack = [
      quote.numero,
      quote.client_nombre,
      quote.client_rnc,
      quote.client_telefono,
      quote.client_email,
      quote.client_direccion,
      quote.fecha,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}
