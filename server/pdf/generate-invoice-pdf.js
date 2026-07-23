const templatePdfService = require('../templates/templatePdfService');
const {
  generateInvoicePdfFromHtml,
  setPdfFromHtmlImplementation,
} = require('./pdf-from-html');

/** Genera PDF de cotización usando la plantilla predeterminada del usuario. */
async function generateInvoicePdf({ quote, emisor, userId, options }) {
  if (!userId) {
    throw new Error('userId es requerido para generar el PDF con plantilla');
  }
  return templatePdfService.generateQuotePdf(quote, emisor, userId, options || {});
}

module.exports = {
  generateInvoicePdf,
  generateInvoicePdfFromHtml,
  setPdfFromHtmlImplementation,
};
