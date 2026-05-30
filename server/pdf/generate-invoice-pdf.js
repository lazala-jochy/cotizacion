const templatePdfService = require('../templates/templatePdfService');
const {
  generateInvoicePdfFromHtml,
  setPdfFromHtmlImplementation,
} = require('./pdf-from-html');

/** Genera PDF de cotización usando la plantilla predeterminada del usuario. */
async function generateInvoicePdf({ quote, emisor, userId }) {
  if (!userId) {
    throw new Error('userId es requerido para generar el PDF con plantilla');
  }
  return templatePdfService.generateQuotePdf(quote, emisor, userId);
}

module.exports = {
  generateInvoicePdf,
  generateInvoicePdfFromHtml,
  setPdfFromHtmlImplementation,
};
