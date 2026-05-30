const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const invoiceRepo = require('../invoices/invoiceRepository');
const auditRepo = require('../invoices/invoiceAuditRepository');
const invoiceService = require('../invoices/invoiceService');
const { InvoiceError } = require('../invoices/invoiceService');
const { mapInvoiceForTemplate, invoiceEstadoLabel } = require('../invoices/invoicePdfMapper');
const templatePdfService = require('../templates/templatePdfService');
const { getSmtpCredentials } = require('../emisorSmtp');
const { sendQuoteEmail } = require('../services/sendQuoteEmail');
const { buildInvoiceEmail, getDefaultInvoiceEmailContent } = require('../email/invoiceEmailTemplate');
const { getEmisorRow, publicEmisorFields } = require('../emisorSmtp');
const { getUserNombre } = require('../quoteDocumentFields');

const router = express.Router();
router.use(authMiddleware);

function getQuoteWithItems(id, userId) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(id, userId);
  if (!quote) return null;
  const items = db
    .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY orden, id')
    .all(id);
  return { ...quote, items };
}

function getEmisorForUser(userId) {
  return publicEmisorFields(getEmisorRow(userId));
}

function handleInvoiceError(err, res) {
  if (err instanceof InvoiceError) {
    const status =
      err.code === 'DUPLICATE_FISCAL' ? 409
      : err.code === 'ALREADY_CONVERTED' ? 409
      :       err.code === 'FISCAL_RANGE' ||
        err.code === 'INVALID_FISCAL' ||
        err.code === 'FISCAL_DOCUMENT_TYPE' ||
        err.code === 'CLIENT_TAX_ID' ?
        400
      : 400;
    return res.status(status).json({ error: err.message, code: err.code });
  }
  if (String(err.message).includes('UNIQUE')) {
    return res.status(409).json({
      error: 'El número de factura ya existe. Operación cancelada.',
      code: 'DUPLICATE_FISCAL',
    });
  }
  console.error(err);
  return res.status(500).json({ error: err.message || 'Error del servidor' });
}

router.get('/', (req, res) => {
  const { estado, search, fiscal_document_type_id } = req.query;
  const list = invoiceRepo.listByUser(req.user.id, {
    estado,
    search,
    fiscal_document_type_id,
  });
  res.json(list);
});

router.get('/next-fiscal-number', (req, res) => {
  try {
    const typeId = Number(req.query.fiscal_document_type_id);
    if (!typeId) {
      return res.status(400).json({
        error: 'Indique fiscal_document_type_id (tipo de comprobante).',
        code: 'FISCAL_DOCUMENT_TYPE',
      });
    }
    res.json(invoiceService.previewNextFiscalNumber(req.user.id, typeId));
  } catch (err) {
    return handleInvoiceError(err, res);
  }
});

router.post('/from-quote/:quoteId', (req, res) => {
  const quote = getQuoteWithItems(Number(req.params.quoteId), req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  try {
    const invoice = invoiceService.convertQuoteToInvoice(
      quote,
      req.user.id,
      getUserNombre(req.user.id),
      req.body || {}
    );
    res.status(201).json(invoice);
  } catch (err) {
    return handleInvoiceError(err, res);
  }
});

router.get('/:id', (req, res) => {
  const invoice = invoiceRepo.getById(Number(req.params.id), req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(invoice);
});

router.get('/:id/audit', (req, res) => {
  const invoice = invoiceRepo.getById(Number(req.params.id), req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(auditRepo.listByInvoice(invoice.id));
});

router.post('/', (req, res) => {
  try {
    const invoice = invoiceService.createManualInvoice(
      req.user.id,
      getUserNombre(req.user.id),
      req.body
    );
    res.status(201).json(invoice);
  } catch (err) {
    return handleInvoiceError(err, res);
  }
});

router.put('/:id', (req, res) => {
  try {
    const invoice = invoiceService.updateInvoice(
      Number(req.params.id),
      req.user.id,
      getUserNombre(req.user.id),
      req.body
    );
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(invoice);
  } catch (err) {
    return handleInvoiceError(err, res);
  }
});

const INVOICE_ESTADOS_VALID = ['pendiente', 'pagada', 'parcial', 'vencida', 'anulada'];

router.patch('/:id/estado', (req, res) => {
  const id = Number(req.params.id);
  const invoice = invoiceRepo.getById(id, req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  const estado = String(req.body.estado || '').trim();
  if (!INVOICE_ESTADOS_VALID.includes(estado)) {
    return res.status(400).json({ error: 'Estado de factura inválido' });
  }
  if (invoice.estado === 'anulada' && estado !== 'anulada') {
    return res.status(400).json({ error: 'No se puede cambiar el estado de una factura anulada.' });
  }

  db.prepare(
    `UPDATE invoices SET estado = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(estado, id, req.user.id);

  const nombre = getUserNombre(req.user.id);
  auditRepo.log(id, req.user.id, nombre, 'editada', {
    campo: 'estado',
    de: invoice.estado,
    a: estado,
    fiscal_number: invoice.fiscal_number,
  });
  if (estado === 'pagada' && invoice.estado !== 'pagada') {
    auditRepo.log(id, req.user.id, nombre, 'pagada', { fiscal_number: invoice.fiscal_number });
  }

  res.json(invoiceRepo.getById(id, req.user.id));
});

router.post('/:id/anular', (req, res) => {
  try {
    const invoice = invoiceService.annulInvoice(
      Number(req.params.id),
      req.user.id,
      getUserNombre(req.user.id),
      req.body?.motivo
    );
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(invoice);
  } catch (err) {
    return handleInvoiceError(err, res);
  }
});

router.delete('/:id', (req, res) => {
  const ok = invoiceRepo.remove(Number(req.params.id), req.user.id);
  if (!ok) {
    return res.status(400).json({
      error: 'Solo se pueden eliminar facturas anuladas.',
    });
  }
  res.json({ ok: true });
});

router.get('/:id/pdf', async (req, res) => {
  const invoice = invoiceRepo.getById(Number(req.params.id), req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  try {
    const emisor = getEmisorForUser(req.user.id);
    const doc = mapInvoiceForTemplate(invoice);
    const buffer = await templatePdfService.generateInvoicePdf(doc, emisor, req.user.id, {
      estadoLabel: invoiceEstadoLabel(invoice.estado),
    });
    const safeName = String(invoice.fiscal_number).replace(/[^\w.-]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Factura-${safeName}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('PDF factura:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF' });
  }
});

router.get('/:id/email-defaults', (req, res) => {
  const invoice = invoiceRepo.getById(Number(req.params.id), req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  const emisor = getEmisorForUser(req.user.id);
  res.json(getDefaultInvoiceEmailContent({ invoice, emisor }));
});

router.post('/:id/send-email', async (req, res) => {
  const invoice = invoiceRepo.getById(Number(req.params.id), req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  if (invoice.estado === 'anulada') {
    return res.status(400).json({ error: 'No se puede enviar una factura anulada.' });
  }

  const smtp = getSmtpCredentials(req.user.id);
  if (!smtp) {
    return res.status(400).json({
      error: 'Configura el correo Gmail y la contraseña en Empresa antes de enviar facturas.',
    });
  }

  const to = (req.body.to || invoice.client_email || '').trim();
  if (!to) {
    return res.status(400).json({ error: 'Indica el correo del destinatario.' });
  }

  const emisor = getEmisorForUser(req.user.id);
  const empresa = emisor.nombre?.trim() || 'Facturación';
  const doc = mapInvoiceForTemplate(invoice);

  let buffer;
  try {
    buffer = await templatePdfService.generateInvoicePdf(doc, emisor, req.user.id, {
      estadoLabel: invoiceEstadoLabel(invoice.estado),
    });
  } catch (err) {
    console.error('PDF factura (email):', err);
    return res.status(500).json({ error: 'No se pudo generar el PDF adjunto' });
  }

  const { subject, text, html, inlineAttachments } = buildInvoiceEmail({
    invoice,
    emisor,
    customSubject: (req.body.subject || '').trim() || undefined,
    customMessage: (req.body.message || '').trim() || undefined,
  });

  try {
    const safeName = String(invoice.fiscal_number).replace(/[^\w.-]+/g, '_');
    await sendQuoteEmail(smtp, {
      fromName: empresa,
      to,
      subject,
      text,
      html,
      inlineAttachments: inlineAttachments || [],
      attachments: [
        {
          filename: `Factura-${safeName}.pdf`,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    });

    auditRepo.log(
      invoice.id,
      req.user.id,
      getUserNombre(req.user.id),
      'enviada',
      { to, fiscal_number: invoice.fiscal_number }
    );

    res.json({ ok: true, invoice: invoiceRepo.getById(invoice.id, req.user.id) });
  } catch (err) {
    console.error('send-email factura:', err);
    res.status(500).json({ error: err.message || 'No se pudo enviar el correo' });
  }
});

module.exports = router;
