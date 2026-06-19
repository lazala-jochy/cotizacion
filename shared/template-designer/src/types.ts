export type TextAlign = 'left' | 'center' | 'right';

export type TemplateElementType =
  | 'companyLogo'
  | 'companyName'
  | 'companyAddress'
  | 'companyPhone'
  | 'companyEmail'
  | 'companyRnc'
  | 'companyTaxInfo'
  | 'clientName'
  | 'clientAddress'
  | 'clientPhone'
  | 'clientEmail'
  | 'clientRnc'
  | 'quotationNumber'
  | 'date'
  | 'validityDays'
  | 'formaPago'
  | 'ejecutivo'
  | 'productTable'
  | 'subtotal'
  | 'tax'
  | 'discount'
  | 'total'
  | 'signature'
  | 'sello'
  | 'notes'
  | 'customMessage'
  | 'freeText'
  | 'image'
  | 'qrCode';

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  textAlign?: TextAlign;
  backgroundColor?: string;
}

export interface TemplateElement {
  id: string;
  type: TemplateElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style?: ElementStyle;
  /** Texto libre o plantilla avanzada con {{placeholders}} (solo texto libre). */
  content?: string;
  /** Etiqueta personalizada del campo. Vacío = etiqueta por defecto del catálogo. */
  fieldLabel?: string;
  /** Si false, el PDF muestra solo el valor sin etiqueta. Por defecto true. */
  showLabel?: boolean;
  /** URL data: o binding para image */
  src?: string;
  zIndex?: number;
}

export interface QuoteTemplateDefinition {
  version: 1;
  pageWidth: number;
  pageHeight: number;
  elements: TemplateElement[];
}

export interface QuoteTemplateRecord {
  id: number;
  user_id: number;
  name: string;
  is_default: boolean;
  definition: QuoteTemplateDefinition;
  created_at: string;
  updated_at: string;
}

export interface PlaceholderContext {
  company_name: string;
  company_name_raw: string;
  company_rnc: string;
  company_rnc_raw: string;
  company_address: string;
  company_address_raw: string;
  company_phone: string;
  company_phone_raw: string;
  company_email: string;
  company_email_raw: string;
  company_tax_info: string;
  company_tax_info_raw: string;
  company_logo: string;
  client_name: string;
  client_name_raw: string;
  client_rnc: string;
  client_rnc_raw: string;
  client_address: string;
  client_address_raw: string;
  client_phone: string;
  client_phone_raw: string;
  client_email: string;
  client_email_raw: string;
  quotation_number: string;
  quotation_number_raw: string;
  fiscal_number: string;
  fiscal_number_raw: string;
  date: string;
  date_raw: string;
  validity_days: string;
  validity_days_raw: string;
  subtotal: string;
  subtotal_raw: string;
  tax: string;
  tax_raw: string;
  discount: string;
  discount_raw: string;
  total: string;
  total_raw: string;
  notes: string;
  notes_raw: string;
  mensaje_pdf: string;
  mensaje_pdf_raw: string;
  signature: string;
  firma_image: string;
  sello_image: string;
  ejecutivo: string;
  ejecutivo_raw: string;
  forma_pago: string;
  forma_pago_raw: string;
  estado: string;
  estado_raw: string;
  items_table_html: string;
  qr_payload: string;
}
