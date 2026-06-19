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
  fiscal_number?: string;
  fecha?: string;
  fecha_vencimiento?: string;
  validez_dias?: number;
  descuento?: number;
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
  firma?: string | null;
  sello?: string | null;
  mensaje_pdf?: string | null;
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

function rawField(value?: string | null): string {
  return String(value ?? '').trim();
}

function emisorImageUrl(value?: string | null): string {
  const s = rawField(value);
  if (!s) return '';
  if (s.startsWith('data:image') || s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }
  return '';
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
  options?: { estadoLabel?: string; documentType?: 'quote' | 'invoice' }
): PlaceholderContext {
  const subtotal = Number(quote.subtotal) || 0;
  const tax = Number(quote.itbis) || 0;
  const disc = Number(quote.descuento) || 0;
  const total = Number(quote.total) || 0;
  const validity = quote.validez_dias ?? 30;
  const estadoText = options?.estadoLabel || quote.estado || '';
  const isInvoice = options?.documentType === 'invoice';
  const docNumber = isInvoice
    ? quote.fiscal_number || quote.numero
    : quote.numero;
  const docLabel = isInvoice ? 'Factura' : PLACEHOLDER_FIELD_LABELS.quotation_number;
  const dateLabel = isInvoice ? 'Fecha de emisión' : PLACEHOLDER_FIELD_LABELS.date;
  const validityLabel = isInvoice ? 'Vencimiento' : PLACEHOLDER_FIELD_LABELS.validity_days;
  const validityValue = isInvoice
    ? quote.fecha_vencimiento
      ? formatDate(quote.fecha_vencimiento)
      : '—'
    : `${validity} días`;

  const companyNameRaw = rawField(emisor.nombre);
  const companyRncRaw = rawField(emisor.rnc);
  const companyAddressRaw = rawField(emisor.direccion);
  const companyPhoneRaw = rawField(emisor.telefono);
  const companyEmailRaw = rawField(emisor.email);
  const clientNameRaw = rawField(quote.client_nombre);
  const clientRncRaw = rawField(quote.client_rnc);
  const clientAddressRaw = rawField(quote.client_direccion);
  const clientPhoneRaw = rawField(quote.client_telefono);
  const clientEmailRaw = rawField(quote.client_email);
  const docNumberRaw = rawField(docNumber);
  const fiscalNumberRaw = rawField(quote.fiscal_number || docNumber);
  const dateRaw = formatDate(quote.fecha || '');
  const subtotalRaw = formatMoney(subtotal);
  const taxRaw = formatMoney(tax);
  const discountRaw = disc > 0 ? formatMoney(disc) : '';
  const totalRaw = formatMoney(total);
  const notesRaw = rawField(quote.notas);
  const mensajePdfRaw = rawField(emisor.mensaje_pdf);
  const ejecutivoRaw = rawField(quote.ejecutivo);
  const formaPagoRaw = rawField(quote.forma_pago);
  const estadoRaw = rawField(estadoText);

  return {
    company_name: labeledField(PLACEHOLDER_FIELD_LABELS.company_name, companyNameRaw),
    company_name_raw: companyNameRaw,
    company_rnc: labeledField(PLACEHOLDER_FIELD_LABELS.company_rnc, companyRncRaw),
    company_rnc_raw: companyRncRaw,
    company_address: labeledField(PLACEHOLDER_FIELD_LABELS.company_address, companyAddressRaw),
    company_address_raw: companyAddressRaw,
    company_phone: labeledField(PLACEHOLDER_FIELD_LABELS.company_phone, companyPhoneRaw),
    company_phone_raw: companyPhoneRaw,
    company_email: labeledField(PLACEHOLDER_FIELD_LABELS.company_email, companyEmailRaw),
    company_email_raw: companyEmailRaw,
    company_tax_info: labeledField(PLACEHOLDER_FIELD_LABELS.company_tax_info, companyRncRaw),
    company_tax_info_raw: companyRncRaw,
    company_logo: emisorImageUrl(emisor.logo),
    firma_image: emisorImageUrl(emisor.firma),
    sello_image: emisorImageUrl(emisor.sello),
    client_name: labeledField(PLACEHOLDER_FIELD_LABELS.client_name, clientNameRaw),
    client_name_raw: clientNameRaw,
    client_rnc: labeledField(PLACEHOLDER_FIELD_LABELS.client_rnc, clientRncRaw),
    client_rnc_raw: clientRncRaw,
    client_address: labeledField(PLACEHOLDER_FIELD_LABELS.client_address, clientAddressRaw),
    client_address_raw: clientAddressRaw,
    client_phone: labeledField(PLACEHOLDER_FIELD_LABELS.client_phone, clientPhoneRaw),
    client_phone_raw: clientPhoneRaw,
    client_email: labeledField(PLACEHOLDER_FIELD_LABELS.client_email, clientEmailRaw),
    client_email_raw: clientEmailRaw,
    quotation_number: labeledField(docLabel, docNumberRaw),
    quotation_number_raw: docNumberRaw,
    fiscal_number: labeledField('Número fiscal', fiscalNumberRaw),
    fiscal_number_raw: fiscalNumberRaw,
    date: labeledField(dateLabel, dateRaw),
    date_raw: dateRaw,
    validity_days: labeledField(validityLabel, validityValue),
    validity_days_raw: rawField(validityValue),
    subtotal: labeledField(PLACEHOLDER_FIELD_LABELS.subtotal, subtotalRaw),
    subtotal_raw: subtotalRaw,
    tax: labeledField(PLACEHOLDER_FIELD_LABELS.tax, taxRaw),
    tax_raw: taxRaw,
    discount:
      disc > 0
        ? labeledField(PLACEHOLDER_FIELD_LABELS.discount, discountRaw)
        : '',
    discount_raw: discountRaw,
    total: labeledField(PLACEHOLDER_FIELD_LABELS.total, totalRaw),
    total_raw: totalRaw,
    notes: labeledField(PLACEHOLDER_FIELD_LABELS.notes, notesRaw),
    notes_raw: notesRaw,
    mensaje_pdf: mensajePdfRaw,
    mensaje_pdf_raw: mensajePdfRaw,
    signature: ejecutivoRaw ? `Atentamente, ${ejecutivoRaw}` : '',
    ejecutivo: labeledField(PLACEHOLDER_FIELD_LABELS.ejecutivo, ejecutivoRaw),
    ejecutivo_raw: ejecutivoRaw,
    forma_pago: labeledField(PLACEHOLDER_FIELD_LABELS.forma_pago, formaPagoRaw),
    forma_pago_raw: formaPagoRaw,
    estado: labeledField(PLACEHOLDER_FIELD_LABELS.estado, estadoRaw),
    estado_raw: estadoRaw,
    items_table_html: buildItemsTableHtml(quote.items),
    qr_payload: isInvoice
      ? `FAC:${quote.fiscal_number || quote.numero || ''}`
      : `COT:${quote.numero || ''}`,
  };
}
