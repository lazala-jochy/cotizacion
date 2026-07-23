const templateRepo = require('./templateRepository');
const {
  renderQuoteWithTemplate,
  renderInvoiceWithTemplate,
} = require('../../shared/template-designer/dist/renderTemplateHtml');
const { generateInvoicePdfFromHtml } = require('../pdf/pdf-from-html');

async function getDefaultDefinition(userId) {
  const template = templateRepo.ensureDefaultTemplate(userId);
  return template.definition;
}

const { normalizeTemplateDefinition } = require('../../shared/template-designer/dist/normalizeTemplateDefinition');

function renderHtmlForQuote(quote, emisor, userId, options = {}) {
  const template = options.template || templateRepo.ensureDefaultTemplate(userId);
  const rawDefinition = options.definition || template.definition;
  const definition = normalizeTemplateDefinition(rawDefinition);
  return renderQuoteWithTemplate(definition, quote, emisor, {
    estadoLabel: options.estadoLabel,
    includeSignature: options.includeSignature,
  });
}

async function generateQuotePdf(quote, emisor, userId, options = {}) {
  const html = renderHtmlForQuote(quote, emisor, userId, options);
  return generateInvoicePdfFromHtml(html);
}

function renderHtmlForInvoice(invoice, emisor, userId, options = {}) {
  const template = options.template || templateRepo.ensureDefaultTemplate(userId);
  const rawDefinition = options.definition || template.definition;
  const definition = normalizeTemplateDefinition(rawDefinition);
  return renderInvoiceWithTemplate(definition, invoice, emisor, {
    estadoLabel: options.estadoLabel,
  });
}

async function generateInvoicePdf(invoice, emisor, userId, options = {}) {
  const html = renderHtmlForInvoice(invoice, emisor, userId, options);
  return generateInvoicePdfFromHtml(html);
}

module.exports = {
  getDefaultDefinition,
  renderHtmlForQuote,
  generateQuotePdf,
  renderHtmlForInvoice,
  generateInvoicePdf,
};
