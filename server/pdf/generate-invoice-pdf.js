const { renderQuoteDocumentHtml } = require('./render-quote-document-html');
const { generatePdfFromHtmlPuppeteer } = require('./html-to-pdf');

let pdfFromHtmlImpl = null;

function setPdfFromHtmlImplementation(impl) {
  pdfFromHtmlImpl = impl;
}

async function generateInvoicePdf({ quote, emisor }) {
  const html = renderQuoteDocumentHtml({ quote, emisor });
  if (pdfFromHtmlImpl) {
    return pdfFromHtmlImpl(html);
  }
  if (process.versions?.electron) {
    throw new Error(
      'El generador de PDF no está listo. Cierra Cotizaciones y vuelve a abrir con npm run dev o desde la app instalada.'
    );
  }
  try {
    return await generatePdfFromHtmlPuppeteer(html);
  } catch (err) {
    throw new Error(
      `${err.message || 'Error al generar PDF'}. Usa npm run dev (Electron) o instala Google Chrome.`
    );
  }
}

module.exports = {
  generateInvoicePdf,
  setPdfFromHtmlImplementation,
  renderQuoteDocumentHtml,
};
