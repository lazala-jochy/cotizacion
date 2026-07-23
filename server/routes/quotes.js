const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { generateInvoicePdf } = require('../pdf/generate-invoice-pdf');
const { getSmtpCredentials } = require('../emisorSmtp');
const { sendQuoteEmail } = require('../services/sendQuoteEmail');
const { buildQuoteEmail, getDefaultEmailContent } = require('../email/quoteEmailTemplate');
const {
  normalizeEstado,
  canEditQuote,
  enrichQuote,
  validateEstado,
  computeFinancials,
  syncEstadoFromPayments,
} = require('../quoteWorkflow');
const { getUserNombre, fillQuoteDocumentFields } = require('../quoteDocumentFields');
const { getEmisorRow, publicEmisorFields } = require('../emisorSmtp');

const router = express.Router();
router.use(authMiddleware);

const {
  calcTotals,
  validateDescuento,
  ITBIS_RATE_DEFAULT_PERCENT,
} = require('../invoices/invoiceTotals');
const expenseService = require('../expenses/expenseService');
const { resolveOrCreateClient } = require('../clients/clientService');

function itemsSubtotal(items) {
  return items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario), 0);
}

function nextQuoteNumber(userId) {
  const year = new Date().getFullYear();
  const prefix = `COT-${year}-`;
  const last = db
    .prepare(
      `SELECT numero FROM quotes WHERE user_id = ? AND numero LIKE ? ORDER BY id DESC LIMIT 1`
    )
    .get(userId, `${prefix}%`);
  let seq = 1;
  if (last?.numero) {
    const part = parseInt(last.numero.replace(prefix, ''), 10);
    if (!Number.isNaN(part)) seq = part + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function getPayments(quoteId) {
  return db
    .prepare('SELECT * FROM quote_payments WHERE quote_id = ? ORDER BY fecha DESC, id DESC')
    .all(quoteId);
}

function getQuoteWithItems(id, userId) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(id, userId);
  if (!quote) return null;
  const items = db
    .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY orden, id')
    .all(id);
  return { ...quote, items };
}

function getQuoteFull(id, userId) {
  const quote = getQuoteWithItems(id, userId);
  if (!quote) return null;
  const payments = getPayments(id);
  const full = enrichQuote(fillQuoteDocumentFields(quote, userId), payments);
  const prof = expenseService.getQuoteProfitability(id, userId);
  if (prof) {
    full.expenses = prof.expenses;
    full.profitability = prof.profitability;
  }
  return full;
}

function recalcQuoteAfterPayments(quoteId, userId) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(quoteId, userId);
  if (!quote) return null;
  const payments = getPayments(quoteId);
  const fin = computeFinancials(quote, payments);
  const newEstado = syncEstadoFromPayments(quote.estado, fin);
  db.prepare(
    `UPDATE quotes SET monto_pagado = ?, estado = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(fin.monto_pagado, newEstado, quoteId, userId);
  return getQuoteFull(quoteId, userId);
}

function enrichQuoteListRow(q) {
  const payments = getPayments(q.id);
  return enrichQuote(q, payments);
}

router.get('/', (req, res) => {
  const quotes = db
    .prepare(
      `SELECT q.* FROM quotes q WHERE q.user_id = ? ORDER BY q.created_at DESC`
    )
    .all(req.user.id);
  res.json(quotes.map((q) => enrichQuoteListRow(q)));
});

router.get('/next-number', (req, res) => {
  res.json({ numero: nextQuoteNumber(req.user.id) });
});

function getEmisorForUser(userId) {
  return publicEmisorFields(getEmisorRow(userId));
}

router.get('/:id/pdf', async (req, res) => {
  let quote = getQuoteFull(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  quote = fillQuoteDocumentFields(quote, req.user.id);

  try {
    const emisor = getEmisorForUser(req.user.id);
    const includeSignature = req.query.incluirFirma !== '0';
    const buffer = await generateInvoicePdf({
      quote,
      emisor,
      userId: req.user.id,
      options: { includeSignature },
    });
    const safeName = String(quote.numero).replace(/[^\w.-]+/g, '_');
    const filename = `Cotizacion-${safeName}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF' });
  }
});

router.get('/:id/email-defaults', (req, res) => {
  const quote = getQuoteFull(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  const emisor = getEmisorForUser(req.user.id);
  res.json(getDefaultEmailContent({ quote, emisor }));
});

router.post('/:id/send-email', async (req, res) => {
  const quote = getQuoteFull(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

  const smtp = getSmtpCredentials(req.user.id);
  if (!smtp) {
    return res.status(400).json({
      error: 'Configura el correo Gmail y la contraseña en Empresa antes de enviar cotizaciones.',
    });
  }

  const to = (req.body.to || quote.client_email || '').trim();
  if (!to) {
    return res.status(400).json({ error: 'Indica el correo del destinatario o agrega email al cliente.' });
  }

  if (!String(quote.ejecutivo || '').trim() && req.body.ejecutivo?.trim()) {
    quote.ejecutivo = req.body.ejecutivo.trim();
  }
  if (!String(quote.ejecutivo || '').trim()) {
    const nombre = getUserNombre(req.user.id);
    if (nombre) quote.ejecutivo = nombre;
  }
  if (quote.ejecutivo) {
    db.prepare('UPDATE quotes SET ejecutivo = ? WHERE id = ? AND user_id = ?').run(
      quote.ejecutivo,
      req.params.id,
      req.user.id
    );
  }

  const emisor = getEmisorForUser(req.user.id);
  const empresa = emisor.nombre?.trim() || 'Cotizaciones';
  const customSubject = (req.body.subject || '').trim();
  const customMessage = (req.body.message || '').trim();

  let buffer;
  try {
    buffer = await generateInvoicePdf({ quote, emisor, userId: req.user.id });
  } catch (err) {
    console.error('PDF error (send-email):', err);
    return res.status(500).json({
      error: `No se pudo generar el PDF adjunto: ${err.message || 'error desconocido'}`,
    });
  }

  const { subject, text, html, inlineAttachments } = buildQuoteEmail({
    quote,
    emisor,
    customSubject: customSubject || undefined,
    customMessage: customMessage || undefined,
  });

  try {
    const safeName = String(quote.numero).replace(/[^\w.-]+/g, '_');
    const filename = `Cotizacion-${safeName}.pdf`;

    await sendQuoteEmail(smtp, {
      fromName: empresa,
      to,
      subject,
      text,
      html,
      inlineAttachments: inlineAttachments || [],
      attachments: [
        {
          filename,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    });

    const estadoActual = normalizeEstado(quote.estado);
    if (!['pagada', 'cancelada'].includes(estadoActual)) {
      db.prepare(
        `UPDATE quotes SET estado = 'enviada', updated_at = datetime('now') WHERE id = ? AND user_id = ?`
      ).run(req.params.id, req.user.id);
    }

    const updated = getQuoteFull(req.params.id, req.user.id);
    res.json({ ok: true, message: `Cotización enviada a ${to}`, quote: updated });
  } catch (err) {
    console.error('Email error:', err);
    const msg = err?.message || String(err);
    if (err?.code === 'EAUTH' || /invalid login|username and password|authentication/i.test(msg)) {
      return res.status(400).json({
        error:
          'No se pudo autenticar en Gmail. Usa tu correo completo y una contraseña de aplicación (no la contraseña normal si tienes verificación en dos pasos).',
      });
    }
    if (/PDF|Chrome|puppeteer|generar el PDF/i.test(msg)) {
      return res.status(500).json({ error: msg });
    }
    res.status(500).json({ error: 'No se pudo enviar el correo. Revisa la configuración en Empresa.' });
  }
});

router.get('/:id', (req, res) => {
  const quote = getQuoteFull(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(quote);
});

router.patch('/:id/estado', (req, res) => {
  const quote = db
    .prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

  const check = validateEstado(req.body.estado);
  if (!check.ok) return res.status(400).json({ error: check.error });

  const current = normalizeEstado(quote.estado);
  if (current === 'pagada' && check.estado !== 'pagada' && check.estado !== 'cancelada') {
    return res.status(400).json({ error: 'La cotización ya está pagada. Elimina pagos para cambiar el estado.' });
  }

  db.prepare(
    `UPDATE quotes SET estado = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(check.estado, req.params.id, req.user.id);

  const updated = recalcQuoteAfterPayments(req.params.id, req.user.id);
  res.json(updated);
});

router.post('/:id/payments', (req, res) => {
  const quote = db
    .prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

  const estado = normalizeEstado(quote.estado);
  if (estado === 'cancelada') {
    return res.status(400).json({ error: 'No se pueden registrar pagos en una cotización cancelada' });
  }
  if (estado === 'creada' || estado === 'enviada') {
    return res.status(400).json({
      error: 'Aprueba la cotización antes de registrar pagos (estado: aprobada o posterior)',
    });
  }

  const monto = Number(req.body.monto);
  if (!monto || monto <= 0) {
    return res.status(400).json({ error: 'El monto del pago debe ser mayor a 0' });
  }

  const fecha = req.body.fecha || new Date().toISOString().slice(0, 10);
  const payments = getPayments(quote.id);
  const fin = computeFinancials(quote, [...payments, { monto }]);
  if (fin.monto_pagado > fin.total + 0.01) {
    return res.status(400).json({
      error: `El pago excede el balance pendiente (${fin.balance_pendiente.toFixed(2)} disponible)`,
    });
  }

  const result = db
    .prepare(
      `INSERT INTO quote_payments (quote_id, monto, fecha, metodo, referencia, notas)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      quote.id,
      monto,
      fecha,
      req.body.metodo?.trim() || null,
      req.body.referencia?.trim() || null,
      req.body.notas?.trim() || null
    );

  const updated = recalcQuoteAfterPayments(quote.id, req.user.id);
  const payment = updated.payments.find((p) => p.id === result.lastInsertRowid);
  res.status(201).json({ quote: updated, payment });
});

router.delete('/:id/payments/:paymentId', (req, res) => {
  const quote = db
    .prepare('SELECT id FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

  const result = db
    .prepare('DELETE FROM quote_payments WHERE id = ? AND quote_id = ?')
    .run(req.params.paymentId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pago no encontrado' });

  const updated = recalcQuoteAfterPayments(req.params.id, req.user.id);
  res.json(updated);
});

router.post('/', (req, res) => {
  const {
    numero,
    fecha,
    validez_dias,
    notas,
    estado,
    items = [],
    client_nombre,
    client_rnc,
    client_direccion,
    client_telefono,
    client_email,
    ejecutivo,
    forma_pago,
    apply_itbis = true,
    itbis_manual = false,
    itbis_rate = ITBIS_RATE_DEFAULT_PERCENT,
    descuento = 0,
  } = req.body;

  if (!items.length) {
    return res.status(400).json({ error: 'Agrega al menos un ítem a la cotización' });
  }

  const clientSnapshot = {
    client_nombre: client_nombre?.trim() || null,
    client_rnc: client_rnc?.trim() || null,
    client_direccion: client_direccion?.trim() || null,
    client_telefono: client_telefono?.trim() || null,
    client_email: client_email?.trim() || null,
  };

  if (!clientSnapshot.client_nombre) {
    return res.status(400).json({ error: 'Datos del cliente son requeridos' });
  }

  const resolvedClient = resolveOrCreateClient(req.user.id, {
    nombre: clientSnapshot.client_nombre,
    rnc: clientSnapshot.client_rnc,
    direccion: clientSnapshot.client_direccion,
    telefono: clientSnapshot.client_telefono,
    email: clientSnapshot.client_email,
  });
  const clientId = resolvedClient?.id ?? null;

  const normalizedItems = items.map((item, idx) => ({
    descripcion: String(item.descripcion || '').trim(),
    cantidad: Number(item.cantidad) || 0,
    precio_unitario: Number(item.precio_unitario) || 0,
    costo_unitario: Math.max(0, Number(item.costo_unitario) || 0),
    orden: idx,
  }));

  if (normalizedItems.some((i) => !i.descripcion || i.cantidad <= 0)) {
    return res.status(400).json({ error: 'Cada ítem necesita descripción y cantidad mayor a 0' });
  }

  const discCheck = validateDescuento(itemsSubtotal(normalizedItems), descuento);
  if (!discCheck.ok) {
    return res.status(400).json({ error: discCheck.error });
  }

  const totals = calcTotals(
    normalizedItems,
    apply_itbis,
    itbis_manual,
    itbis_rate,
    descuento
  );
  const quoteNumero = numero?.trim() || nextQuoteNumber(req.user.id);
  const quoteFecha = fecha || new Date().toISOString().slice(0, 10);
  const estadoInicial = validateEstado(estado || 'creada').estado || 'creada';
  if (estadoInicial !== 'creada') {
    return res.status(400).json({ error: 'Las cotizaciones nuevas deben crearse en estado Creada' });
  }

  const insertQuote = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO quotes (
          user_id, client_id, numero, fecha, validez_dias, notas, subtotal, itbis, descuento, total, estado,
          client_nombre, client_rnc, client_direccion, client_telefono, client_email,
          itbis_rate, itbis_manual, monto_pagado, ejecutivo, forma_pago
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(
        req.user.id,
        clientId,
        quoteNumero,
        quoteFecha,
        validez_dias ?? 30,
        notas?.trim() || null,
        totals.subtotal,
        totals.itbis,
        totals.descuento,
        totals.total,
        estadoInicial,
        clientSnapshot.client_nombre,
        clientSnapshot.client_rnc,
        clientSnapshot.client_direccion,
        clientSnapshot.client_telefono,
        clientSnapshot.client_email,
        totals.itbis_rate,
        totals.itbis_manual,
        ejecutivo?.trim() || getUserNombre(req.user.id) || null,
        forma_pago?.trim() || 'Efectivo / Transferencia'
      );

    const quoteId = result.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO quote_items (quote_id, descripcion, cantidad, precio_unitario, costo_unitario, total, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of normalizedItems) {
      const lineTotal = item.cantidad * item.precio_unitario;
      insertItem.run(
        quoteId,
        item.descripcion,
        item.cantidad,
        item.precio_unitario,
        item.costo_unitario,
        lineTotal,
        item.orden
      );
    }
    return quoteId;
  });

  const id = insertQuote();
  res.status(201).json(getQuoteFull(id, req.user.id));
});

router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Cotización no encontrada' });

  if (!canEditQuote(existing.estado)) {
    return res.status(400).json({
      error:
        'No se puede editar una cotización pagada o cancelada.',
    });
  }

  const {
    fecha,
    validez_dias,
    notas,
    items = [],
    client_nombre,
    client_rnc,
    client_direccion,
    client_telefono,
    client_email,
    ejecutivo,
    forma_pago,
    apply_itbis = true,
    itbis_manual = false,
    itbis_rate = ITBIS_RATE_DEFAULT_PERCENT,
    descuento = 0,
  } = req.body;

  if (!client_nombre?.trim()) {
    return res.status(400).json({ error: 'Datos del cliente son requeridos' });
  }

  if (!items.length) {
    return res.status(400).json({ error: 'Agrega al menos un ítem' });
  }

  const normalizedItems = items.map((item, idx) => ({
    descripcion: String(item.descripcion || '').trim(),
    cantidad: Number(item.cantidad) || 0,
    precio_unitario: Number(item.precio_unitario) || 0,
    costo_unitario: Math.max(0, Number(item.costo_unitario) || 0),
    orden: idx,
  }));

  if (normalizedItems.some((i) => !i.descripcion || i.cantidad <= 0)) {
    return res.status(400).json({ error: 'Cada ítem necesita descripción y cantidad mayor a 0' });
  }

  const discCheck = validateDescuento(itemsSubtotal(normalizedItems), descuento);
  if (!discCheck.ok) {
    return res.status(400).json({ error: discCheck.error });
  }

  const totals = calcTotals(
    normalizedItems,
    apply_itbis,
    itbis_manual,
    itbis_rate,
    descuento
  );

  const resolvedClient = resolveOrCreateClient(req.user.id, {
    nombre: client_nombre?.trim(),
    rnc: client_rnc?.trim() || null,
    direccion: client_direccion?.trim() || null,
    telefono: client_telefono?.trim() || null,
    email: client_email?.trim() || null,
  });
  const clientId = resolvedClient?.id ?? null;

  const updateAll = db.transaction(() => {
    db.prepare(
      `UPDATE quotes SET
        client_id=?, fecha=?, validez_dias=?, notas=?, subtotal=?, itbis=?, descuento=?, total=?,
        client_nombre=?, client_rnc=?, client_direccion=?, client_telefono=?, client_email=?,
        itbis_rate=?, itbis_manual=?, ejecutivo=?, forma_pago=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(
      clientId,
      fecha,
      validez_dias ?? 30,
      notas?.trim() || null,
      totals.subtotal,
      totals.itbis,
      totals.descuento,
      totals.total,
      client_nombre?.trim(),
      client_rnc?.trim() || null,
      client_direccion?.trim() || null,
      client_telefono?.trim() || null,
      client_email?.trim() || null,
      totals.itbis_rate,
      totals.itbis_manual,
      ejecutivo?.trim() || getUserNombre(req.user.id) || null,
      forma_pago?.trim() || 'Efectivo / Transferencia',
      req.params.id,
      req.user.id
    );
    db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(req.params.id);
    const insertItem = db.prepare(
      `INSERT INTO quote_items (quote_id, descripcion, cantidad, precio_unitario, costo_unitario, total, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of normalizedItems) {
      const lineTotal = item.cantidad * item.precio_unitario;
      insertItem.run(
        req.params.id,
        item.descripcion,
        item.cantidad,
        item.precio_unitario,
        item.costo_unitario,
        lineTotal,
        item.orden
      );
    }
  });

  updateAll();
  res.json(recalcQuoteAfterPayments(req.params.id, req.user.id));
});

router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM quotes WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json({ ok: true });
});

module.exports = router;
