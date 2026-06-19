import { PLACEHOLDER_FIELD_LABELS } from './placeholderLabels';
import type { TemplateElementType } from './types';

/** Tipo de elemento → clave de etiqueta por defecto. */
export const TYPE_TO_FIELD_LABEL_KEY: Partial<
  Record<TemplateElementType, keyof typeof PLACEHOLDER_FIELD_LABELS>
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
};

export function isDataBoundField(type: TemplateElementType): boolean {
  return Boolean(TYPE_TO_FIELD_LABEL_KEY[type]);
}

export function getDefaultFieldLabel(type: TemplateElementType): string {
  const key = TYPE_TO_FIELD_LABEL_KEY[type];
  if (!key) return '';
  return PLACEHOLDER_FIELD_LABELS[key];
}
