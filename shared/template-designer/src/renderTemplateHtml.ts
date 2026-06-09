import { getCatalogEntry } from './elementCatalog';
import { shouldUseCatalogPlaceholder } from './normalizeTemplateDefinition';
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
  subtotal: 'subtotal',
  tax: 'tax',
  discount: 'discount',
  total: 'total',
  notes: 'notes',
  signature: 'signature',
};

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
  const contextKey = TYPE_TO_CONTEXT_KEY[el.type as TemplateElementType];
  const useCatalog = shouldUseCatalogPlaceholder(el);

  if (contextKey && useCatalog) {
    const showLabel = el.showLabel !== false;
    const key = showLabel
      ? contextKey
      : (`${String(contextKey)}_raw` as keyof PlaceholderContext);
    const value = context[key];
    return value != null ? String(value) : '';
  }

  if (el.content?.trim()) {
    return replacePlaceholders(el.content, context);
  }
  const entry = getCatalogEntry(el.type);
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

  if (type === 'companyLogo') {
    const src = context.company_logo || el.src || '';
    if (!src) return '';
    return `<div class="td-el td-el-logo" style="${baseStyle}"><img src="${src}" alt="" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`;
  }

  if (type === 'image' && (el.src || '').startsWith('data:image')) {
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
  if (type === 'discount' && !text.trim()) {
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
  .td-items { width: 100%; border-collapse: collapse; font-size: 11px; }
  .td-items th, .td-items td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  .td-items th { background: #f1f5f9; font-weight: 600; }
  .td-items .num { text-align: right; }
  .td-empty { color: #94a3b8; font-size: 12px; }
`;

export function renderTemplateBodyHtml(
  definition: QuoteTemplateDefinition,
  context: PlaceholderContext
): string {
  const sorted = [...definition.elements].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)
  );
  const inner = sorted.map((el) => renderElementHtml(el, context)).join('\n');
  return `<div class="td-page" style="width:${definition.pageWidth}px;height:${definition.pageHeight}px">${inner}</div>`;
}

export function renderTemplateDocumentHtml(
  definition: QuoteTemplateDefinition,
  context: PlaceholderContext,
  title = 'Cotización'
): string {
  const body = renderTemplateBodyHtml(definition, context);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${TEMPLATE_PAGE_STYLES}</style>
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
