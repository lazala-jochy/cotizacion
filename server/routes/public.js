const express = require('express');
const db = require('../db');
const { generateInvoicePdf } = require('../pdf/generate-invoice-pdf');
const { enrichQuote } = require('../quoteWorkflow');
const { fillQuoteDocumentFields } = require('../quoteDocumentFields');
const { getEmisorRow, publicEmisorFields } = require('../emisorSmtp');

const router = express.Router();

router.get('/pdf/:token', async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 16) {
    return res.status(400).json({ error: 'Token inválido' });
  }

  const quote = db
    .prepare('SELECT * FROM quotes WHERE pdf_token = ?')
    .get(token);

  if (!quote) {
    return res.status(404).json({ error: 'Documento no encontrado o enlace expirado' });
  }

  const items = db
    .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY orden')
    .all(quote.id);
  quote.items = items;

  const payments = db
    .prepare('SELECT * FROM quote_payments WHERE quote_id = ? ORDER BY fecha DESC')
    .all(quote.id);
  const enriched = enrichQuote(fillQuoteDocumentFields(quote, quote.user_id), payments);

  const emisor = publicEmisorFields(getEmisorRow(quote.user_id));

  try {
    const buffer = await generateInvoicePdf({
      quote: enriched,
      emisor,
      userId: quote.user_id,
    });
    const safeName = String(quote.numero).replace(/[^\w.-]+/g, '_');
    const filename = `Cotizacion-${safeName}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Public PDF error:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF' });
  }
});

module.exports = router;
