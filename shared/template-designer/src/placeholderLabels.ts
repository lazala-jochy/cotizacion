import { formatLabeled } from './formatLabeled';

/**
 * Etiquetas en español para cada campo de plantilla.
 * Todos los valores visibles usan "Etiqueta: valor" (misma lógica que RNC).
 */
export const PLACEHOLDER_FIELD_LABELS = {
  company_name: 'Empresa',
  company_rnc: 'RNC',
  company_address: 'Dirección',
  company_phone: 'Teléfono',
  company_email: 'Correo',
  company_tax_info: 'RNC',
  client_name: 'Cliente',
  client_rnc: 'RNC',
  client_address: 'Dirección',
  client_phone: 'Teléfono',
  client_email: 'Correo',
  quotation_number: 'Cotización',
  validity_days: 'Vigencia',
  date: 'Fecha',
  subtotal: 'Subtotal',
  tax: 'ITBIS',
  discount: 'Descuento',
  total: 'Total',
  notes: 'Notas',
  ejecutivo: 'Ejecutivo',
  forma_pago: 'Forma de pago',
  estado: 'Estado',
} as const;

export type LabeledFieldKey = keyof typeof PLACEHOLDER_FIELD_LABELS;

export function labeledField(label: string, value?: string | null): string {
  return formatLabeled(label, value);
}
