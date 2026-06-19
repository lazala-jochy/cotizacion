import { getCatalogEntry } from './elementCatalog';
import { getDefaultFieldLabel } from './elementFieldLabels';
import { formatLabeled } from './formatLabeled';
import { normalizeTemplateDefinition } from './normalizeTemplateDefinition';
import { buildPlaceholderContext, replacePlaceholders } from './placeholders';
import type {
  PlaceholderContext,
  QuoteTemplateDefinition,
  TemplateElement,
  TemplateElementType,
} from './types';

/** Valor ya etiquetado en contexto según tipo de elemento del catálogo. */
const TYPE_TO_CONTEXT_KEY: Partial<
  Record<TemplateElementType, keyof PlaceholderContext>
> = {
  companyName: 'company_name',
  companyRnc: 'company_rnc',
  companyAddress: 'company_address',
  companyPhone: 'company_phone',
  companyEmail: 'company_email',
  companyTaxInfo: 'company_tax_info',
  clientName: 'client_name',
  clientRnc: 'client_rnc',
  clientAddress: 'client_address',
  clientPhone: 'client_phone',
  clientEmail: 'client_email',
  quotationNumber: 'quotation_number',
  date: 'date',
  validityDays: 'validity_days',
  formaPago: 'forma_pago',
  ejecutivo: 'ejecutivo',
  subtotal: 'subtotal',
  tax: 'tax',
  discount: 'discount',
  total: 'total',
  notes: 'notes',
  customMessage: 'mensaje_pdf',
  signature: 'signature',
};

function emisorImageUrl(value?: string | null): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (s.startsWith('data:image') || s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }
  return '';
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styleToCss(style: TemplateElement['style']): string {
  if (!style) return '';
  const parts: string[] = [];
  if (style.fontFamily) parts.push(`font-family:${style.fontFamily}`);
  if (style.fontSize) parts.push(`font-size:${style.fontSize}px`);
  if (style.fontWeight) parts.push(`font-weight:${style.fontWeight}`);
  if (style.fontStyle) parts.push(`font-style:${style.fontStyle}`);
  if (style.color) parts.push(`color:${style.color}`);
  if (style.textAlign) parts.push(`text-align:${style.textAlign}`);
  if (style.backgroundColor) parts.push(`background-color:${style.backgroundColor}`);
  return parts.join(';');
}

function resolveElementText(
  el: TemplateElement,
  context: PlaceholderContext
): string {
  const type = el.type as TemplateElementType;
  const contextKey = TYPE_TO_CONTEXT_KEY[type];

  if (el.content?.trim() && /\{\{\w+\}\}/.test(el.content)) {
    return replacePlaceholders(el.content, context);
  }

  if (contextKey) {
    if (type === 'signature') {
      const ejecutivoRaw = String(context.ejecutivo_raw ?? '').trim();
      if (el.showLabel === false) return ejecutivoRaw;
      const customLabel = el.fieldLabel?.trim();
      if (customLabel) {
        return ejecutivoRaw ? formatLabeled(customLabel, ejecutivoRaw) : '';
      }
      return String(context.signature ?? '');
    }

    if (type === 'customMessage') {
      const override = el.content?.trim();
      if (override) {
        return /\{\{/.test(override)
          ? replacePlaceholders(override, context)
          : override;
      }
      return String(context.mensaje_pdf_raw ?? '').trim();
    }

    const rawKey = `${String(contextKey)}_raw` as keyof PlaceholderContext;
    const raw = String(context[rawKey] ?? '').trim();
    if (type === 'discount' && !raw) return '';

    if (el.showLabel === false) return raw;

    const customLabel = el.fieldLabel?.trim();
    if (customLabel) return formatLabeled(customLabel, raw);

    const labeled = context[contextKey];
    return labeled != null ? String(labeled) : '';
  }

  if (el.content?.trim()) {
    return replacePlaceholders(el.content, context);
  }
  const entry = getCatalogEntry(type);
  if (entry.placeholder) {
    return replacePlaceholders(entry.placeholder, context);
  }
  if (entry.defaultContent) {
    return replacePlaceholders(entry.defaultContent, context);
  }
  return '';
}

function renderElementHtml(el: TemplateElement, context: PlaceholderContext): string {
  const rot = el.rotation ? `transform:rotate(${el.rotation}deg);` : '';
  const baseStyle = [
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    `z-index:${el.zIndex ?? 1}`,
    rot,
    styleToCss(el.style),
  ]
    .filter(Boolean)
    .join(';');

  const type = el.type as TemplateElementType;

  if (type === 'signature') {
    const firmaSrc = emisorImageUrl(context.firma_image);
    if (firmaSrc) {
      return '';
    }
  }

  if (type === 'sello') {
    if (emisorImageUrl(context.sello_image)) {
      return '';
    }
  }

  if (type === 'companyLogo') {
    const src = emisorImageUrl(context.company_logo) || emisorImageUrl(el.src || '');
    if (!src) return '';
    return `<div class="td-el td-el-logo" style="${baseStyle}"><img src="${src}" alt="" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`;
  }

  if (type === 'image' && emisorImageUrl(el.src || '')) {
    return `<div class="td-el td-el-image" style="${baseStyle}"><img src="${el.src}" alt="" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`;
  }

  if (type === 'productTable') {
    return `<div class="td-el td-el-table" style="${baseStyle}">${context.items_table_html}</div>`;
  }

  if (type === 'qrCode') {
    const payload = encodeURIComponent(context.qr_payload || '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${payload}`;
    return `<div class="td-el td-el-qr" style="${baseStyle}"><img src="${qrUrl}" alt="QR" style="width:100%;height:100%;object-fit:contain" /></div>`;
  }

  const text = resolveElementText(el, context);
  if ((type === 'discount' || type === 'customMessage') && !text.trim()) {
    return '';
  }
  const inner = escapeHtml(text).replace(/\n/g, '<br>');
  return `<div class="td-el td-el-text" style="${baseStyle}"><div class="td-el-text-inner">${inner}</div></div>`;
}

export const TEMPLATE_PAGE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; background: #e8eef4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .td-page {
    position: relative;
    margin: 0 auto;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  .td-el { position: absolute; overflow: hidden; }
  .td-el-text-inner {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    word-break: break-word;
    line-height: 1.35;
  }
  .td-el-signature-caption {
    font-size: 10px;
    text-align: center;
    margin-top: 2px;
    color: #334155;
  }
  .td-emisor-stamps {
    pointer-events: none;
  }
  .td-stamp-firma img {
    max-height: 72px;
    max-width: 220px;
    object-fit: contain;
    display: block;
  }
  .td-stamp-sello img {
    max-height: 100px;
    max-width: 120px;
    object-fit: contain;
    display: block;
  }
  .td-stamp-caption {
    font-size: 10px;
    color: #334155;
    margin-top: 4px;
    text-align: left;
  }
  .td-items { width: 100%; border-collapse: collapse; font-size: 11px; }
  .td-items th, .td-items td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  .td-items th { background: #f1f5f9; font-weight: 600; }
  .td-items .num { text-align: right; }
  .td-empty { color: #94a3b8; font-size: 12px; }
`;

function buildPdfPrintStyles(definition: QuoteTemplateDefinition): string {
  const { pageWidth, pageHeight } = definition;
  return `
  @page {
    size: ${pageWidth}px ${pageHeight}px;
    margin: 0;
  }
  html, body {
    width: ${pageWidth}px;
    height: ${pageHeight}px;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #fff;
  }
  .td-page {
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: avoid;
    page-break-inside: avoid;
  }`;
}

/** Bloque fijo al pie del PDF con firma y sello de la empresa. */
function renderEmisorStampsFooter(
  context: PlaceholderContext,
  pageWidth: number,
  pageHeight: number
): string {
  const firma = emisorImageUrl(context.firma_image);
  const sello = emisorImageUrl(context.sello_image);
  if (!firma && !sello) return '';

  const ejecutivo = String(context.ejecutivo_raw ?? '').trim();
  const firmaHtml = firma
    ? `<div class="td-stamp-firma"><img src="${firma}" alt="Firma" /></div>${
        ejecutivo ? `<div class="td-stamp-caption">${escapeHtml(ejecutivo)}</div>` : ''
      }`
    : '';
  const selloHtml = sello
    ? `<div class="td-stamp-sello"><img src="${sello}" alt="Sello" /></div>`
    : '';

  return `<div class="td-el td-emisor-stamps" style="position:absolute;left:40px;width:${pageWidth - 80}px;top:${pageHeight - 128}px;height:120px;z-index:50;display:flex;align-items:flex-end;justify-content:space-between;">
    <div class="td-stamp-firma-wrap">${firmaHtml}</div>
    <div class="td-stamp-sello-wrap">${selloHtml}</div>
  </div>`;
}

export function renderTemplateBodyHtml(
  definition: QuoteTemplateDefinition,
  context: PlaceholderContext
): string {
  const normalized = normalizeTemplateDefinition(definition);
  const sorted = [...normalized.elements].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)
  );
  const inner = sorted.map((el) => renderElementHtml(el, context)).join('\n');
  const stamps = renderEmisorStampsFooter(
    context,
    normalized.pageWidth,
    normalized.pageHeight
  );
  return `<div class="td-page" style="width:${normalized.pageWidth}px;height:${normalized.pageHeight}px">${inner}${stamps}</div>`;
}

export function renderTemplateDocumentHtml(
  definition: QuoteTemplateDefinition,
  context: PlaceholderContext,
  title = 'Cotización'
): string {
  const normalized = normalizeTemplateDefinition(definition);
  const body = renderTemplateBodyHtml(normalized, context);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${TEMPLATE_PAGE_STYLES}${buildPdfPrintStyles(normalized)}</style>
</head>
<body>${body}</body>
</html>`;
}

export function renderQuoteWithTemplate(
  definition: QuoteTemplateDefinition,
  quote: Parameters<typeof buildPlaceholderContext>[0],
  emisor: Parameters<typeof buildPlaceholderContext>[1],
  options?: Parameters<typeof buildPlaceholderContext>[2]
): string {
  const context = buildPlaceholderContext(quote, emisor, options);
  return renderTemplateDocumentHtml(
    definition,
    context,
    `Cotización ${quote.numero || ''}`
  );
}

export function renderInvoiceWithTemplate(
  definition: QuoteTemplateDefinition,
  invoice: Parameters<typeof buildPlaceholderContext>[0],
  emisor: Parameters<typeof buildPlaceholderContext>[1],
  options?: Parameters<typeof buildPlaceholderContext>[2]
): string {
  const context = buildPlaceholderContext(invoice, emisor, {
    ...options,
    documentType: 'invoice',
  });
  const num = invoice.fiscal_number || invoice.numero || '';
  return renderTemplateDocumentHtml(definition, context, `Factura ${num}`);
}
