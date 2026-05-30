const INVOICE_ESTADO_LABELS = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  parcial: 'Parcial',
  vencida: 'Vencida',
  anulada: 'Anulada',
};

function mapInvoiceForTemplate(invoice) {
  return {
    numero: invoice.fiscal_number,
    fiscal_number: invoice.fiscal_number,
    numero_interno: invoice.numero,
    fecha: invoice.fecha_emision,
    fecha_vencimiento: invoice.fecha_vencimiento,
    validez_dias: undefined,
    notas: invoice.notas,
    subtotal: invoice.subtotal,
    itbis: invoice.itbis,
    descuento: invoice.descuento,
    total: invoice.total,
    itbis_rate: invoice.itbis_rate,
    itbis_manual: invoice.itbis_manual,
    ejecutivo: invoice.ejecutivo,
    forma_pago: invoice.forma_pago,
    estado: invoice.estado,
    client_nombre: invoice.client_nombre,
    client_rnc: invoice.client_rnc,
    client_direccion: invoice.client_direccion,
    client_telefono: invoice.client_telefono,
    client_email: invoice.client_email,
    items: invoice.items,
  };
}

function invoiceEstadoLabel(estado) {
  return INVOICE_ESTADO_LABELS[estado] || estado || '';
}

module.exports = { mapInvoiceForTemplate, invoiceEstadoLabel, INVOICE_ESTADO_LABELS };
