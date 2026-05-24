const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { generateInvoicePdf } = require('../pdf/generate-invoice-pdf');

const router = express.Router();
router.use(authMiddleware);

const ITBIS_RATE_DEFAULT_PERCENT = 18;

function resolveItbisRate(applyItbis, itbisManual, itbisRate) {
  if (!applyItbis) return 0;
  if (itbisManual) {
    const pct = Number(itbisRate);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return ITBIS_RATE_DEFAULT_PERCENT;
    return pct;
  }
  return ITBIS_RATE_DEFAULT_PERCENT;
}

function calcTotals(items, applyItbis = true, itbisManual = false, itbisRate = ITBIS_RATE_DEFAULT_PERCENT) {
  const subtotal = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario), 0);
  const pct = resolveItbisRate(applyItbis, itbisManual, itbisRate);
  const itbis = applyItbis ? subtotal * (pct / 100) : 0;
  return { subtotal, itbis, total: subtotal + itbis, itbis_rate: pct, itbis_manual: itbisManual ? 1 : 0 };
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

function getQuoteWithItems(id, userId) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(id, userId);
  if (!quote) return null;
  const items = db
    .prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY orden, id')
    .all(id);
  return { ...quote, items };
}

router.get('/', (req, res) => {
  const quotes = db
    .prepare(
      `SELECT q.*, c.nombre as client_ref_nombre
       FROM quotes q
       LEFT JOIN clients c ON c.id = q.client_id
       WHERE q.user_id = ?
       ORDER BY q.created_at DESC`
    )
    .all(req.user.id);
  res.json(quotes);
});

router.get('/next-number', (req, res) => {
  res.json({ numero: nextQuoteNumber(req.user.id) });
});

function getEmisorForUser(userId) {
  let row = db.prepare('SELECT * FROM emisor_settings WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO emisor_settings (user_id, nombre) VALUES (?, ?)').run(userId, '');
    row = db.prepare('SELECT * FROM emisor_settings WHERE user_id = ?').get(userId);
  }
  return {
    nombre: row.nombre || '',
    rnc: row.rnc || '',
    direccion: row.direccion || '',
    telefono: row.telefono || '',
    email: row.email || '',
    logo: row.logo || null,
  };
}

router.get('/:id/pdf', async (req, res) => {
  const quote = getQuoteWithItems(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

  try {
    const emisor = getEmisorForUser(req.user.id);
    const buffer = await generateInvoicePdf({ quote, emisor });
    const safeName = String(quote.numero).replace(/[^\w.-]+/g, '_');
    const filename = `Pre-factura-${safeName}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF' });
  }
});

router.get('/:id', (req, res) => {
  const quote = getQuoteWithItems(req.params.id, req.user.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(quote);
});

router.post('/', (req, res) => {
  const {
    client_id,
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
    apply_itbis = true,
    itbis_manual = false,
    itbis_rate = ITBIS_RATE_DEFAULT_PERCENT,
  } = req.body;

  if (!items.length) {
    return res.status(400).json({ error: 'Agrega al menos un ítem a la cotización' });
  }

  let clientSnapshot = {
    client_nombre: client_nombre?.trim() || null,
    client_rnc: client_rnc?.trim() || null,
    client_direccion: client_direccion?.trim() || null,
    client_telefono: client_telefono?.trim() || null,
    client_email: client_email?.trim() || null,
  };

  if (client_id) {
    const client = db
      .prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?')
      .get(client_id, req.user.id);
    if (!client) return res.status(400).json({ error: 'Cliente no válido' });
    clientSnapshot = {
      client_nombre: client.nombre,
      client_rnc: client.rnc,
      client_direccion: client.direccion,
      client_telefono: client.telefono,
      client_email: client.email,
    };
  }

  if (!clientSnapshot.client_nombre) {
    return res.status(400).json({ error: 'Datos del cliente son requeridos' });
  }

  const normalizedItems = items.map((item, idx) => ({
    descripcion: String(item.descripcion || '').trim(),
    cantidad: Number(item.cantidad) || 0,
    precio_unitario: Number(item.precio_unitario) || 0,
    orden: idx,
  }));

  if (normalizedItems.some((i) => !i.descripcion || i.cantidad <= 0)) {
    return res.status(400).json({ error: 'Cada ítem necesita descripción y cantidad mayor a 0' });
  }

  const totals = calcTotals(normalizedItems, apply_itbis, itbis_manual, itbis_rate);
  const quoteNumero = numero?.trim() || nextQuoteNumber(req.user.id);
  const quoteFecha = fecha || new Date().toISOString().slice(0, 10);

  const insertQuote = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO quotes (
          user_id, client_id, numero, fecha, validez_dias, notas, subtotal, itbis, total, estado,
          client_nombre, client_rnc, client_direccion, client_telefono, client_email,
          itbis_rate, itbis_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        client_id || null,
        quoteNumero,
        quoteFecha,
        validez_dias ?? 30,
        notas?.trim() || null,
        totals.subtotal,
        totals.itbis,
        totals.total,
        estado || 'borrador',
        clientSnapshot.client_nombre,
        clientSnapshot.client_rnc,
        clientSnapshot.client_direccion,
        clientSnapshot.client_telefono,
        clientSnapshot.client_email,
        totals.itbis_rate,
        totals.itbis_manual
      );

    const quoteId = result.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO quote_items (quote_id, descripcion, cantidad, precio_unitario, total, orden)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const item of normalizedItems) {
      const lineTotal = item.cantidad * item.precio_unitario;
      insertItem.run(quoteId, item.descripcion, item.cantidad, item.precio_unitario, lineTotal, item.orden);
    }
    return quoteId;
  });

  const id = insertQuote();
  res.status(201).json(getQuoteWithItems(id, req.user.id));
});

router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT id FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Cotización no encontrada' });

  const {
    client_id,
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
    apply_itbis = true,
    itbis_manual = false,
    itbis_rate = ITBIS_RATE_DEFAULT_PERCENT,
  } = req.body;

  if (!items.length) {
    return res.status(400).json({ error: 'Agrega al menos un ítem' });
  }

  const normalizedItems = items.map((item, idx) => ({
    descripcion: String(item.descripcion || '').trim(),
    cantidad: Number(item.cantidad) || 0,
    precio_unitario: Number(item.precio_unitario) || 0,
    orden: idx,
  }));

  if (normalizedItems.some((i) => !i.descripcion || i.cantidad <= 0)) {
    return res.status(400).json({ error: 'Cada ítem necesita descripción y cantidad mayor a 0' });
  }

  const totals = calcTotals(normalizedItems, apply_itbis, itbis_manual, itbis_rate);

  const updateAll = db.transaction(() => {
    db.prepare(
      `UPDATE quotes SET
        client_id=?, fecha=?, validez_dias=?, notas=?, subtotal=?, itbis=?, total=?, estado=?,
        client_nombre=?, client_rnc=?, client_direccion=?, client_telefono=?, client_email=?,
        itbis_rate=?, itbis_manual=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(
      client_id || null,
      fecha,
      validez_dias ?? 30,
      notas?.trim() || null,
      totals.subtotal,
      totals.itbis,
      totals.total,
      estado || 'borrador',
      client_nombre?.trim(),
      client_rnc?.trim() || null,
      client_direccion?.trim() || null,
      client_telefono?.trim() || null,
      client_email?.trim() || null,
      totals.itbis_rate,
      totals.itbis_manual,
      req.params.id,
      req.user.id
    );
    db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(req.params.id);
    const insertItem = db.prepare(
      `INSERT INTO quote_items (quote_id, descripcion, cantidad, precio_unitario, total, orden)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const item of normalizedItems) {
      const lineTotal = item.cantidad * item.precio_unitario;
      insertItem.run(
        req.params.id,
        item.descripcion,
        item.cantidad,
        item.precio_unitario,
        lineTotal,
        item.orden
      );
    }
  });

  updateAll();
  res.json(getQuoteWithItems(req.params.id, req.user.id));
});

router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM quotes WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json({ ok: true });
});

module.exports = router;
