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
  | 'productTable'
  | 'subtotal'
  | 'tax'
  | 'discount'
  | 'total'
  | 'signature'
  | 'notes'
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
  /** Texto fijo o con placeholders {{company_name}} */
  content?: string;
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
  company_rnc: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_tax_info: string;
  company_logo: string;
  client_name: string;
  client_rnc: string;
  client_address: string;
  client_phone: string;
  client_email: string;
  quotation_number: string;
  fiscal_number: string;
  date: string;
  validity_days: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  notes: string;
  signature: string;
  ejecutivo: string;
  forma_pago: string;
  estado: string;
  items_table_html: string;
  qr_payload: string;
}
