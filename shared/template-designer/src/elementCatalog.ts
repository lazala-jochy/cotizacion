import type { TemplateElementType } from './types';

export interface ElementCatalogEntry {
  type: TemplateElementType;
  label: string;
  category: 'empresa' | 'cliente' | 'cotizacion' | 'totales' | 'otros';
  defaultWidth: number;
  defaultHeight: number;
  placeholder?: string;
  defaultContent?: string;
}

export const ELEMENT_CATALOG: ElementCatalogEntry[] = [
  { type: 'companyLogo', label: 'Logo', category: 'empresa', defaultWidth: 140, defaultHeight: 56 },
  {
    type: 'companyName',
    label: 'Nombre empresa',
    category: 'empresa',
    defaultWidth: 280,
    defaultHeight: 32,
    placeholder: '{{company_name}}',
  },
  {
    type: 'companyRnc',
    label: 'RNC empresa',
    category: 'empresa',
    defaultWidth: 280,
    defaultHeight: 24,
    placeholder: '{{company_rnc}}',
  },
  {
    type: 'companyAddress',
    label: 'Dirección empresa',
    category: 'empresa',
    defaultWidth: 320,
    defaultHeight: 48,
    placeholder: '{{company_address}}',
  },
  {
    type: 'companyPhone',
    label: 'Teléfono empresa',
    category: 'empresa',
    defaultWidth: 280,
    defaultHeight: 24,
    placeholder: '{{company_phone}}',
  },
  {
    type: 'companyEmail',
    label: 'Correo empresa',
    category: 'empresa',
    defaultWidth: 300,
    defaultHeight: 24,
    placeholder: '{{company_email}}',
  },
  {
    type: 'companyTaxInfo',
    label: 'Info fiscal',
    category: 'empresa',
    defaultWidth: 280,
    defaultHeight: 40,
    placeholder: '{{company_tax_info}}',
  },
  {
    type: 'clientName',
    label: 'Nombre cliente',
    category: 'cliente',
    defaultWidth: 320,
    defaultHeight: 28,
    placeholder: '{{client_name}}',
  },
  {
    type: 'clientRnc',
    label: 'RNC cliente',
    category: 'cliente',
    defaultWidth: 320,
    defaultHeight: 24,
    placeholder: '{{client_rnc}}',
  },
  {
    type: 'clientAddress',
    label: 'Dirección cliente',
    category: 'cliente',
    defaultWidth: 360,
    defaultHeight: 48,
    placeholder: '{{client_address}}',
  },
  {
    type: 'clientPhone',
    label: 'Teléfono cliente',
    category: 'cliente',
    defaultWidth: 320,
    defaultHeight: 24,
    placeholder: '{{client_phone}}',
  },
  {
    type: 'clientEmail',
    label: 'Correo cliente',
    category: 'cliente',
    defaultWidth: 340,
    defaultHeight: 24,
    placeholder: '{{client_email}}',
  },
  {
    type: 'quotationNumber',
    label: 'Nº cotización',
    category: 'cotizacion',
    defaultWidth: 280,
    defaultHeight: 28,
    placeholder: '{{quotation_number}}',
  },
  {
    type: 'date',
    label: 'Fecha',
    category: 'cotizacion',
    defaultWidth: 240,
    defaultHeight: 24,
    placeholder: '{{date}}',
  },
  {
    type: 'validityDays',
    label: 'Vigencia',
    category: 'cotizacion',
    defaultWidth: 200,
    defaultHeight: 24,
    placeholder: '{{validity_days}}',
  },
  {
    type: 'productTable',
    label: 'Tabla productos',
    category: 'cotizacion',
    defaultWidth: 520,
    defaultHeight: 200,
  },
  {
    type: 'subtotal',
    label: 'Subtotal',
    category: 'totales',
    defaultWidth: 260,
    defaultHeight: 24,
    placeholder: '{{subtotal}}',
  },
  {
    type: 'tax',
    label: 'Impuestos',
    category: 'totales',
    defaultWidth: 260,
    defaultHeight: 24,
    placeholder: '{{tax}}',
  },
  {
    type: 'discount',
    label: 'Descuento',
    category: 'totales',
    defaultWidth: 260,
    defaultHeight: 24,
    placeholder: '{{discount}}',
  },
  {
    type: 'total',
    label: 'Total',
    category: 'totales',
    defaultWidth: 280,
    defaultHeight: 32,
    placeholder: '{{total}}',
  },
  {
    type: 'signature',
    label: 'Firma',
    category: 'otros',
    defaultWidth: 280,
    defaultHeight: 60,
    placeholder: '{{signature}}',
  },
  {
    type: 'notes',
    label: 'Notas',
    category: 'otros',
    defaultWidth: 400,
    defaultHeight: 80,
    placeholder: '{{notes}}',
  },
  { type: 'freeText', label: 'Texto libre', category: 'otros', defaultWidth: 200, defaultHeight: 40, defaultContent: 'Texto' },
  { type: 'image', label: 'Imagen', category: 'otros', defaultWidth: 120, defaultHeight: 80 },
  { type: 'qrCode', label: 'Código QR', category: 'otros', defaultWidth: 96, defaultHeight: 96 },
];

export function getCatalogEntry(type: TemplateElementType): ElementCatalogEntry {
  const found = ELEMENT_CATALOG.find((e) => e.type === type);
  if (!found) throw new Error(`Tipo de elemento desconocido: ${type}`);
  return found;
}

/** Campos de datos cuyo PDF puede mostrar etiqueta opcional (Cliente: valor). */
export const LABELABLE_FIELD_TYPES: TemplateElementType[] = [
  'companyName',
  'companyRnc',
  'companyAddress',
  'companyPhone',
  'companyEmail',
  'companyTaxInfo',
  'clientName',
  'clientRnc',
  'clientAddress',
  'clientPhone',
  'clientEmail',
  'quotationNumber',
  'date',
  'validityDays',
  'subtotal',
  'tax',
  'discount',
  'total',
  'notes',
];
