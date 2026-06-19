import { isCloseBlockType } from './closeBlockTypes';
import {
  emisorImageUrl,
  resolveElementText,
  shouldRenderElement,
} from './elementVisibility';
import { normalizeTemplateDefinition } from './normalizeTemplateDefinition';
import { buildPlaceholderContext } from './placeholders';
import {
  countQuoteItems,
  resolveTemplateLayout,
  type ResolvedBox,
} from './resolveTemplateLayout';
import type {
  PlaceholderContext,
  QuoteTemplateDefinition,
  TemplateElement,
  TemplateElementType,
} from './types';

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

function renderElementHtml(
  el: TemplateElement,
  context: PlaceholderContext,
  box?: ResolvedBox
): string {
  if (!shouldRenderElement(el, context)) {
    return '';
  }

  const x = box?.x ?? el.x;
  const y = box?.y ?? el.y;
  const width = box?.width ?? el.width;
  const resolvedHeight = box?.height ?? el.height;
  const heightCss = resolvedHeight === 'auto' ? 'auto' : `${resolvedHeight}px`;

  const rot = el.rotation ? `transform:rotate(${el.rotation}deg);` : '';
  const baseStyle = [
    `left:${x}px`,
    `top:${y}px`,
    `width:${width}px`,
    `height:${heightCss}`,
    `z-index:${el.zIndex ?? 1}`,
    rot,
    styleToCss(el.style),
  ]
    .filter(Boolean)
    .join(';');

  const type = el.type as TemplateElementType;
  const dataType =
    type === 'productTable' || isCloseBlockType(type) ? ` data-type="${type}"` : '';

  if (type === 'signature') {
    const firmaSrc = emisorImageUrl(context.firma_image);
    if (firmaSrc) {
      return `<div class="td-el td-el-signature"${dataType} style="${baseStyle}"><img src="${firmaSrc}" alt="Firma" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`;
    }
  }

  if (type === 'sello') {
    const selloSrc = emisorImageUrl(context.sello_image);
    if (selloSrc) {
      return `<div class="td-el td-el-sello"${dataType} style="${baseStyle}"><img src="${selloSrc}" alt="Sello" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`;
    }
    return '';
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
    return `<div class="td-el td-el-table"${dataType} style="${baseStyle}">${context.items_table_html}</div>`;
  }

  if (type === 'horizontalLine') {
    const color = el.style?.color || '#94a3b8';
    const thickness = Math.max(1, Math.min(el.height, 12));
    const offset = Math.max(0, Math.floor((el.height - thickness) / 2));
    return `<div class="td-el td-el-line" style="${baseStyle}"><div class="td-el-line-rule" style="margin-top:${offset}px;border-top:${thickness}px solid ${escapeHtml(color)};width:100%"></div></div>`;
  }

  if (type === 'qrCode') {
    const payload = encodeURIComponent(context.qr_payload || '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${payload}`;
    return `<div class="td-el td-el-qr" style="${baseStyle}"><img src="${qrUrl}" alt="QR" style="width:100%;height:100%;object-fit:contain" /></div>`;
  }

  const text = resolveElementText(el, context);
  if (!text.trim()) {
    return '';
  }
  const inner = escapeHtml(text).replace(/\n/g, '<br>');
  return `<div class="td-el td-el-text"${dataType} style="${baseStyle}"><div class="td-el-text-inner">${inner}</div></div>`;
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
  .td-el-signature img,
  .td-el-sello img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }
  .td-el-signature-caption {
    font-size: 10px;
    text-align: center;
    margin-top: 2px;
    color: #334155;
  }
  .td-el-table {
    overflow: visible;
    min-height: 0;
  }
  .td-el-line {
    overflow: visible;
  }
  .td-el-line-rule {
    box-sizing: border-box;
  }
  .td-items { width: 100%; border-collapse: collapse; font-size: 11px; }
  .td-items th, .td-items td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  .td-items th {
    background: #f8fafc;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
  }
  .td-items tbody tr:nth-child(even) { background: #fafbfc; }
  .td-items .num { text-align: right; font-variant-numeric: tabular-nums; }
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

export interface RenderTemplateBodyOptions {
  itemCount?: number;
}

export function renderTemplateBodyHtml(
  definition: QuoteTemplateDefinition,
  context: PlaceholderContext,
  options: RenderTemplateBodyOptions = {}
): string {
  const normalized = normalizeTemplateDefinition(definition, {
    allowAugment: !definition.layoutLocked,
  });
  const itemCount = options.itemCount ?? 0;
  const layout = resolveTemplateLayout(normalized, itemCount, { context });
  const sorted = [...normalized.elements].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)
  );
  const inner = sorted
    .map((el) => renderElementHtml(el, context, layout.get(el.id)))
    .join('\n');
  return `<div class="td-page" style="width:${normalized.pageWidth}px;height:${normalized.pageHeight}px">${inner}</div>`;
}

export function renderTemplateDocumentHtml(
  definition: QuoteTemplateDefinition,
  context: PlaceholderContext,
  title = 'Cotización',
  options: RenderTemplateBodyOptions = {}
): string {
  const normalized = normalizeTemplateDefinition(definition);
  const body = renderTemplateBodyHtml(normalized, context, options);
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
  const itemCount = countQuoteItems(quote.items);
  return renderTemplateDocumentHtml(
    definition,
    context,
    `Cotización ${quote.numero || ''}`,
    { itemCount }
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
  const itemCount = countQuoteItems(invoice.items);
  return renderTemplateDocumentHtml(definition, context, `Factura ${num}`, { itemCount });
}
