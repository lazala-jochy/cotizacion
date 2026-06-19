import { getCatalogEntry } from './elementCatalog';
import { augmentTemplateDefinition } from './augmentTemplateDefinition';
import type { QuoteTemplateDefinition, TemplateElement, TemplateElementType } from './types';

/** Contenidos antiguos (con o sin etiqueta duplicada) → usar placeholder del catálogo. */
const LEGACY_BARE_PLACEHOLDERS: Partial<Record<TemplateElementType, string[]>> = {
  companyName: ['{{company_name}}', 'Empresa: {{company_name}}'],
  companyRnc: ['{{company_rnc}}', 'RNC: {{company_rnc}}'],
  companyAddress: ['{{company_address}}', 'Dirección: {{company_address}}'],
  companyPhone: [
    '{{company_phone}}',
    'Tel: {{company_phone}}',
    'Tel.: {{company_phone}}',
    'Teléfono: {{company_phone}}',
  ],
  companyEmail: ['{{company_email}}', 'Correo: {{company_email}}'],
  companyTaxInfo: ['{{company_tax_info}}', 'RNC: {{company_tax_info}}'],
  clientName: ['{{client_name}}', 'Cliente: {{client_name}}'],
  clientRnc: ['{{client_rnc}}', 'RNC: {{client_rnc}}'],
  clientAddress: ['{{client_address}}', 'Dirección: {{client_address}}'],
  clientPhone: [
    '{{client_phone}}',
    'Tel: {{client_phone}}',
    'Teléfono: {{client_phone}}',
  ],
  clientEmail: ['{{client_email}}', 'Correo: {{client_email}}'],
  quotationNumber: [
    '{{quotation_number}}',
    'Cotización {{quotation_number}}',
    'Cotización: {{quotation_number}}',
  ],
  date: ['{{date}}', 'Fecha: {{date}}'],
  validityDays: ['{{validity_days}}', 'Válida {{validity_days}}', 'Vigencia: {{validity_days}}'],
  formaPago: ['{{forma_pago}}', 'Forma de pago: {{forma_pago}}', 'Forma de pago: {{forma_pago_raw}}'],
  ejecutivo: ['{{ejecutivo}}', 'Ejecutivo: {{ejecutivo}}', 'Ejecutivo: {{ejecutivo_raw}}'],
  subtotal: ['{{subtotal}}', 'Subtotal: {{subtotal}}'],
  tax: ['{{tax}}', 'ITBIS: {{tax}}', 'Impuestos: {{tax}}'],
  discount: ['{{discount}}', 'Descuento: {{discount}}'],
  total: ['{{total}}', 'Total: {{total}}'],
  notes: ['{{notes}}', 'Notas: {{notes}}'],
  customMessage: ['{{mensaje_pdf}}'],
};

export function shouldUseCatalogPlaceholder(el: TemplateElement): boolean {
  const content = (el.content || '').trim();
  if (!content) return true;
  const legacy = LEGACY_BARE_PLACEHOLDERS[el.type];
  if (!legacy) return false;
  return legacy.includes(content);
}

/** Quita etiquetas "Cliente:" sueltas si el bloque de nombre usa el catálogo. */
function removeRedundantClientLabel(elements: TemplateElement[]): TemplateElement[] {
  const hasClientName = elements.some((el) => el.type === 'clientName');
  if (!hasClientName) return elements;
  return elements.filter(
    (el) =>
      !(
        el.type === 'freeText' &&
        (el.content || '').trim().toLowerCase() === 'cliente:'
      )
  );
}

/** Alinea elementos guardados con placeholders etiquetados del catálogo. */
export function normalizeTemplateDefinition(
  definition: QuoteTemplateDefinition
): QuoteTemplateDefinition {
  let elements = definition.elements.map((el) => {
    if (!shouldUseCatalogPlaceholder(el)) return el;
    try {
      const entry = getCatalogEntry(el.type);
      if (!entry.placeholder && !entry.defaultContent) return el;
      const { content: _removed, ...rest } = el;
      return rest;
    } catch {
      return el;
    }
  });
  elements = removeRedundantClientLabel(elements);
  return augmentTemplateDefinition({ ...definition, elements });
}
