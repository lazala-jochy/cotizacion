const db = require('../db');

function tableHasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

function clientStatus(lastPurchaseDate, pendingCount, totalPurchased) {
  if (!lastPurchaseDate && totalPurchased === 0) return 'nuevo';
  if (pendingCount > 0) return 'con_deuda';
  const daysSince = lastPurchaseDate
    ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / 86400000)
    : 999;
  if (daysSince <= 90) return 'activo';
  if (daysSince <= 180) return 'inactivo';
  return 'dormido';
}

const STATUS_LABELS = {
  nuevo: 'Nuevo',
  activo: 'Activo',
  inactivo: 'Inactivo',
  dormido: 'Dormido',
  con_deuda: 'Con deuda',
};

function getClientCrmList(userId) {
  const clients = db
    .prepare(`SELECT * FROM clients WHERE user_id = ? ORDER BY nombre COLLATE NOCASE`)
    .all(userId);

  const invoiceStats = db
    .prepare(
      `SELECT client_nombre,
         COALESCE(SUM(CASE WHEN estado != 'anulada' THEN total ELSE 0 END), 0) AS total_purchased,
         MAX(CASE WHEN estado != 'anulada' THEN fecha_emision END) AS last_purchase,
         COUNT(CASE WHEN estado IN ('pendiente', 'parcial', 'vencida') THEN 1 END) AS pending_invoices,
         COALESCE(SUM(CASE WHEN estado IN ('pendiente', 'parcial', 'vencida') THEN total - COALESCE(monto_pagado, 0) ELSE 0 END), 0) AS pending_balance
       FROM invoices WHERE user_id = ?
       GROUP BY client_nombre`
    )
    .all(userId);

  const quoteCounts = db
    .prepare(
      `SELECT client_nombre, COUNT(*) AS quote_count
       FROM quotes WHERE user_id = ?
       GROUP BY client_nombre`
    )
    .all(userId);

  const statsByName = {};

  for (const s of invoiceStats) {
    if (s.client_nombre) statsByName[s.client_nombre.trim().toLowerCase()] = s;
  }

  const quotesByName = {};
  for (const q of quoteCounts) {
    if (q.client_nombre) quotesByName[q.client_nombre.trim().toLowerCase()] = Number(q.quote_count);
  }

  const hasInvoiceClientId = tableHasColumn('invoices', 'client_id');
  const statsByClientId = {};
  const quotesByClientId = {};

  if (hasInvoiceClientId) {
    const byClientId = db
      .prepare(
        `SELECT client_id,
           COALESCE(SUM(CASE WHEN estado != 'anulada' THEN total ELSE 0 END), 0) AS total_purchased,
           MAX(CASE WHEN estado != 'anulada' THEN fecha_emision END) AS last_purchase,
           COUNT(CASE WHEN estado IN ('pendiente', 'parcial', 'vencida') THEN 1 END) AS pending_invoices,
           COALESCE(SUM(CASE WHEN estado IN ('pendiente', 'parcial', 'vencida') THEN total - COALESCE(monto_pagado, 0) ELSE 0 END), 0) AS pending_balance
         FROM invoices WHERE user_id = ? AND client_id IS NOT NULL
         GROUP BY client_id`
      )
      .all(userId);
    for (const s of byClientId) {
      if (s.client_id) statsByClientId[s.client_id] = s;
    }
  }

  if (tableHasColumn('quotes', 'client_id')) {
    const byQuoteClient = db
      .prepare(
        `SELECT client_id, COUNT(*) AS quote_count
         FROM quotes WHERE user_id = ? AND client_id IS NOT NULL
         GROUP BY client_id`
      )
      .all(userId);
    for (const q of byQuoteClient) {
      if (q.client_id) quotesByClientId[q.client_id] = Number(q.quote_count);
    }
  }

  return clients.map((c) => {
    const inv =
      statsByClientId[c.id] ||
      statsByName[(c.nombre || '').trim().toLowerCase()] ||
      {};
    const totalPurchased = Number(inv.total_purchased) || 0;
    const pendingInvoices = Number(inv.pending_invoices) || 0;
    const lastPurchase = inv.last_purchase || null;
    const quoteCount =
      quotesByClientId[c.id] ||
      quotesByName[(c.nombre || '').trim().toLowerCase()] ||
      0;
    const status = clientStatus(lastPurchase, pendingInvoices, totalPurchased);

    return {
      ...c,
      totalPurchased,
      lastPurchase,
      pendingInvoices,
      pendingBalance: Number(inv.pending_balance) || 0,
      quoteCount,
      status,
      statusLabel: STATUS_LABELS[status],
    };
  });
}

function getClientCrmDetail(userId, clientId) {
  const client = db
    .prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?')
    .get(clientId, userId);
  if (!client) return null;

  const hasInvoiceClientId = tableHasColumn('invoices', 'client_id');
  const hasQuoteClientId = tableHasColumn('quotes', 'client_id');

  const invoices = hasInvoiceClientId
    ? db
        .prepare(
          `SELECT * FROM invoices
           WHERE user_id = ? AND (client_id = ? OR LOWER(TRIM(client_nombre)) = LOWER(TRIM(?)))
           ORDER BY fecha_emision DESC LIMIT 50`
        )
        .all(userId, clientId, client.nombre)
    : db
        .prepare(
          `SELECT * FROM invoices
           WHERE user_id = ? AND LOWER(TRIM(client_nombre)) = LOWER(TRIM(?))
           ORDER BY fecha_emision DESC LIMIT 50`
        )
        .all(userId, client.nombre);

  const quotes = hasQuoteClientId
    ? db
        .prepare(
          `SELECT * FROM quotes
           WHERE user_id = ? AND (client_id = ? OR LOWER(TRIM(client_nombre)) = LOWER(TRIM(?)))
           ORDER BY fecha DESC LIMIT 50`
        )
        .all(userId, clientId, client.nombre)
    : db
        .prepare(
          `SELECT * FROM quotes
           WHERE user_id = ? AND LOWER(TRIM(client_nombre)) = LOWER(TRIM(?))
           ORDER BY fecha DESC LIMIT 50`
        )
        .all(userId, client.nombre);

  const totalPurchased = invoices
    .filter((i) => i.estado !== 'anulada')
    .reduce((s, i) => s + Number(i.total), 0);
  const pendingInvoices = invoices.filter((i) =>
    ['pendiente', 'parcial', 'vencida'].includes(i.estado)
  );
  const lastPurchase = invoices.find((i) => i.estado !== 'anulada')?.fecha_emision || null;

  const status = clientStatus(
    lastPurchase,
    pendingInvoices.length,
    totalPurchased
  );

  return {
    client,
    summary: {
      totalPurchased,
      lastPurchase,
      pendingInvoices: pendingInvoices.length,
      pendingBalance: pendingInvoices.reduce(
        (s, i) => s + (Number(i.total) - Number(i.monto_pagado || 0)),
        0
      ),
      quoteCount: quotes.length,
      status,
      statusLabel: STATUS_LABELS[status],
    },
    invoices,
    quotes,
  };
}

module.exports = { getClientCrmList, getClientCrmDetail, STATUS_LABELS };
