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
  fiscal_range_id: number;
  numero: string;
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
}
