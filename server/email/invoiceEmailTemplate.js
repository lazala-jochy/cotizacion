const {
  buildQuoteEmail,
  formatMoney,
  formatDate,
} = require('./quoteEmailTemplate');
const { invoiceEstadoLabel } = require('../invoices/invoicePdfMapper');

const DEFAULT_INTRO =
  'Adjuntamos la factura correspondiente. Quedamos atentos ante cualquier consulta.';

function buildInvoiceEmail({ invoice, emisor, customMessage, customSubject }) {
  const empresa = emisor?.nombre?.trim() || 'Nuestra empresa';
  const cliente = invoice.client_nombre?.trim() || 'estimado cliente';
  const subject =
    customSubject?.trim() || `Factura ${invoice.fiscal_number} — ${empresa}`;
  const intro = customMessage?.trim() || DEFAULT_INTRO;

  const pseudoQuote = {
    numero: invoice.fiscal_number,
    fecha: invoice.fecha_emision,
    validez_dias: null,
    total: invoice.total,
    client_nombre: invoice.client_nombre,
  };

  const base = buildQuoteEmail({
    quote: pseudoQuote,
    emisor,
    customMessage: intro,
    customSubject: subject,
  });

  const estado = invoiceEstadoLabel(invoice.estado);
  const textExtra = [
    '',
    'DETALLE DE FACTURA',
    `  Número fiscal: ${invoice.fiscal_number}`,
    `  Referencia:    ${invoice.numero}`,
    `  Emisión:       ${formatDate(invoice.fecha_emision)}`,
    invoice.fecha_vencimiento
      ? `  Vencimiento:   ${formatDate(invoice.fecha_vencimiento)}`
      : null,
    `  Estado:        ${estado}`,
    `  Total:         ${formatMoney(invoice.total)}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    ...base,
    subject,
    text: base.text.replace('RESUMEN DE LA COTIZACIÓN', 'RESUMEN DE LA FACTURA') + textExtra,
  };
}

function getDefaultInvoiceEmailContent({ invoice, emisor }) {
  const { subject } = buildInvoiceEmail({ invoice, emisor });
  return { subject, message: DEFAULT_INTRO };
}

module.exports = {
  buildInvoiceEmail,
  getDefaultInvoiceEmailContent,
  DEFAULT_INTRO,
};
