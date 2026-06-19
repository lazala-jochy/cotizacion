import { getCatalogEntry } from './elementCatalog';
import { formatLabeled } from './formatLabeled';
import { replacePlaceholders } from './placeholders';
import type {
  PlaceholderContext,
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
  companyCelular: 'company_celular',
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

/** Texto que se imprimiría para un elemento de plantilla. */
export function resolveElementText(
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

/** Si el elemento debe ocupar espacio en el PDF. */
export function shouldRenderElement(
  el: TemplateElement,
  context: PlaceholderContext
): boolean {
  const type = el.type as TemplateElementType;

  if (type === 'signature') {
    if (emisorImageUrl(context.firma_image)) return true;
    return resolveElementText(el, context).trim().length > 0;
  }
  if (type === 'sello') {
    return emisorImageUrl(context.sello_image).length > 0;
  }
  if (type === 'companyLogo') {
    return (
      emisorImageUrl(context.company_logo).length > 0 ||
      emisorImageUrl(el.src || '').length > 0
    );
  }
  if (type === 'image') {
    return emisorImageUrl(el.src || '').length > 0;
  }
  if (type === 'productTable' || type === 'qrCode' || type === 'horizontalLine') {
    return true;
  }

  return resolveElementText(el, context).trim().length > 0;
}

export { emisorImageUrl };
