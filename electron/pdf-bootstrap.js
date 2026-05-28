/**
 * Debe cargarse antes que server/index.js para que el PDF use Chromium de Electron.
 */
const { setPdfFromHtmlImplementation } = require('../server/pdf/generate-invoice-pdf');
const { generatePdfFromHtmlElectron } = require('./generate-pdf-from-html');

setPdfFromHtmlImplementation(generatePdfFromHtmlElectron);
