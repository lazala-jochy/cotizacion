export type FiscalRangeEstado = 'activo' | 'inactivo';

export type InvoiceEstado =
  | 'pendiente'
  | 'pagada'
  | 'parcial'
  | 'vencida'
  | 'anulada';

export type InvoiceAuditAction =
  | 'creada'
  | 'editada'
  | 'anulada'
  | 'enviada'
  | 'pagada';

export interface FiscalDocumentType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  requires_tax_id: boolean;
  is_electronic: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiscalSequence {
  id: number;
  user_id: number;
  fiscal_document_type_id: number;
  start_number: number;
  end_number: number;
  last_used_number: number;
  expiration_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  document_type_code?: string;
  document_type_name?: string;
  document_type_requires_tax_id?: boolean;
  document_type_is_electronic?: boolean;
}

/** @deprecated Use FiscalSequence */
export interface FiscalRange {
  id: number;
  user_id: number;
  tipo_comprobante: string;
  serie: string;
  prefijo: string | null;
  numero_inicial: number;
  numero_final: number;
  ultimo_numero_utilizado: number;
  fecha_vencimiento: string | null;
  estado: FiscalRangeEstado;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  orden?: number;
}

export interface Invoice {
  id: number;
  user_id: number;
  quote_id: number | null;
  fiscal_range_id: number | null;
  fiscal_sequence_id: number | null;
  fiscal_document_type_id: number | null;
  numero: string;
  /** Número fiscal NCF / e-CF (invoiceNumber) */
  fiscal_number: string;
  serie: string;
  secuencia: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: InvoiceEstado;
  client_nombre: string | null;
  client_rnc: string | null;
  client_direccion: string | null;
  client_telefono: string | null;
  client_email: string | null;
  subtotal: number;
  itbis: number;
  descuento: number;
  total: number;
  itbis_rate: number;
  itbis_manual: number;
  notas: string | null;
  ejecutivo: string | null;
  forma_pago: string | null;
  monto_pagado: number;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  quote_numero?: string | null;
  document_type_code?: string | null;
  document_type_name?: string | null;
}
