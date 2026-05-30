import { parseQuoteDate } from './reportStats';
import { normalizeInvoiceEstado } from '../constants/invoiceEstados';

export {
  MONTO_FILTER_OPTIONS,
  MONTH_FILTER_OPTIONS,
} from './quoteListFilters';

export function getInvoiceFilterYearOptions(invoices) {
  const current = new Date().getFullYear();
  let minYear = current;
  for (const inv of invoices) {
    const d = parseQuoteDate(inv.fecha_emision);
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

export function invoiceMatchesListFilters(
  invoice,
  { yearFilter, monthFilter, montoFilter, estadoFilter, search }
) {
  if (estadoFilter && normalizeInvoiceEstado(invoice.estado) !== estadoFilter) {
    return false;
  }

  if (yearFilter || monthFilter) {
    const d = parseQuoteDate(invoice.fecha_emision);
    if (!d) return false;
    if (yearFilter && d.getFullYear() !== Number(yearFilter)) return false;
    if (monthFilter) {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      if (m !== monthFilter) return false;
    }
  }

  if (!matchesMontoRange(invoice.total, montoFilter)) return false;

  const q = search.trim().toLowerCase();
  if (q) {
    const haystack = [
      invoice.fiscal_number,
      invoice.numero,
      invoice.client_nombre,
      invoice.client_rnc,
      invoice.client_telefono,
      invoice.client_email,
      invoice.client_direccion,
      invoice.fecha_emision,
      invoice.quote_numero,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function invoiceBalancePendiente(invoice) {
  const total = Number(invoice.total) || 0;
  const paid = Number(invoice.monto_pagado) || 0;
  if (normalizeInvoiceEstado(invoice.estado) === 'anulada') return 0;
  if (normalizeInvoiceEstado(invoice.estado) === 'pagada') return 0;
  return Math.max(0, total - paid);
}
