import { labeledField, PLACEHOLDER_FIELD_LABELS } from './placeholderLabels';
import type { PlaceholderContext } from './types';

const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

export function replacePlaceholders(
  text: string,
  context: PlaceholderContext
): string {
  return text.replace(PLACEHOLDER_REGEX, (_, key: string) => {
    const value = context[key as keyof PlaceholderContext];
    return value != null ? String(value) : '';
  });
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
  }).format(amount || 0);
}

function formatDate(fecha: string): string {
  if (!fecha) return '';
  try {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
}

interface QuoteLike {
  numero?: string;
  fecha?: string;
  validez_dias?: number;
  notas?: string;
  subtotal?: number;
  itbis?: number;
  total?: number;
  ejecutivo?: string;
  forma_pago?: string;
  estado?: string;
  client_nombre?: string;
  client_rnc?: string;
  client_direccion?: string;
  client_telefono?: string;
  client_email?: string;
  items?: Array<{
    descripcion?: string;
    cantidad?: number;
    precio_unitario?: number;
    total?: number;
  }>;
}

interface EmisorLike {
  nombre?: string;
  rnc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string | null;
}

export function buildItemsTableHtml(
  items: QuoteLike['items'],
  formatMoneyFn: (n: number) => string = formatMoney
): string {
  const rows = (items || []).filter(
    (i) => (Number(i.cantidad) || 0) > 0 && String(i.descripcion || '').trim()
  );
  if (!rows.length) {
    return '<p class="td-empty">Sin ítems</p>';
  }
  const body = rows
    .map((item, idx) => {
      const qty = Number(item.cantidad) || 0;
      const unit = Number(item.precio_unitario) || 0;
      const line = item.total != null ? Number(item.total) : qty * unit;
      return `<tr>
        <td>${idx + 1}</td>
        <td class="num">${qty}</td>
        <td>${escapeHtml(String(item.descripcion))}</td>
        <td class="num">${escapeHtml(formatMoneyFn(unit))}</td>
        <td class="num">${escapeHtml(formatMoneyFn(line))}</td>
      </tr>`;
    })
    .join('');
  return `<table class="td-items">
    <thead><tr>
      <th>#</th><th>Cant.</th><th>Descripción</th><th class="num">P. unit.</th><th class="num">Valor</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPlaceholderContext(
  quote: QuoteLike,
  emisor: EmisorLike,
  options?: { estadoLabel?: string }
): PlaceholderContext {
  const subtotal = Number(quote.subtotal) || 0;
  const tax = Number(quote.itbis) || 0;
  const total = Number(quote.total) || 0;
  const validity = quote.validez_dias ?? 30;
  const estadoText = options?.estadoLabel || quote.estado || '';

  return {
    company_name: labeledField(PLACEHOLDER_FIELD_LABELS.company_name, emisor.nombre),
    company_rnc: labeledField(PLACEHOLDER_FIELD_LABELS.company_rnc, emisor.rnc),
    company_address: labeledField(PLACEHOLDER_FIELD_LABELS.company_address, emisor.direccion),
    company_phone: labeledField(PLACEHOLDER_FIELD_LABELS.company_phone, emisor.telefono),
    company_email: labeledField(PLACEHOLDER_FIELD_LABELS.company_email, emisor.email),
    company_tax_info: labeledField(PLACEHOLDER_FIELD_LABELS.company_tax_info, emisor.rnc),
    company_logo: emisor.logo?.startsWith('data:image') ? emisor.logo : '',
    client_name: labeledField(PLACEHOLDER_FIELD_LABELS.client_name, quote.client_nombre),
    client_rnc: labeledField(PLACEHOLDER_FIELD_LABELS.client_rnc, quote.client_rnc),
    client_address: labeledField(PLACEHOLDER_FIELD_LABELS.client_address, quote.client_direccion),
    client_phone: labeledField(PLACEHOLDER_FIELD_LABELS.client_phone, quote.client_telefono),
    client_email: labeledField(PLACEHOLDER_FIELD_LABELS.client_email, quote.client_email),
    quotation_number: labeledField(
      PLACEHOLDER_FIELD_LABELS.quotation_number,
      quote.numero
    ),
    date: labeledField(PLACEHOLDER_FIELD_LABELS.date, formatDate(quote.fecha || '')),
    validity_days: labeledField(
      PLACEHOLDER_FIELD_LABELS.validity_days,
      `${validity} días`
    ),
    subtotal: labeledField(PLACEHOLDER_FIELD_LABELS.subtotal, formatMoney(subtotal)),
    tax: labeledField(PLACEHOLDER_FIELD_LABELS.tax, formatMoney(tax)),
    discount: '',
    total: labeledField(PLACEHOLDER_FIELD_LABELS.total, formatMoney(total)),
    notes: labeledField(PLACEHOLDER_FIELD_LABELS.notes, quote.notas),
    signature: quote.ejecutivo?.trim() ? `Atentamente, ${quote.ejecutivo}` : '',
    ejecutivo: labeledField(PLACEHOLDER_FIELD_LABELS.ejecutivo, quote.ejecutivo),
    forma_pago: labeledField(PLACEHOLDER_FIELD_LABELS.forma_pago, quote.forma_pago),
    estado: labeledField(PLACEHOLDER_FIELD_LABELS.estado, estadoText),
    items_table_html: buildItemsTableHtml(quote.items),
    qr_payload: `COT:${quote.numero || ''}`,
  };
}
