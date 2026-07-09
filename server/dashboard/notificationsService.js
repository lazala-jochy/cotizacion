const db = require('../db');

function overdueInvoices(userId) {
  return db
    .prepare(
      `SELECT id, numero, fiscal_number, client_nombre, total, monto_pagado, fecha_vencimiento, estado
       FROM invoices
       WHERE user_id = ? AND estado != 'anulada'
         AND (
           estado = 'vencida'
           OR (estado IN ('pendiente', 'parcial') AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < date('now'))
         )
       ORDER BY fecha_vencimiento ASC
       LIMIT 20`
    )
    .all(userId);
}

function pendingQuotes(userId) {
  return db
    .prepare(
      `SELECT id, numero, client_nombre, total, estado, fecha, updated_at
       FROM quotes
       WHERE user_id = ? AND estado IN ('enviada', 'en_proceso', 'creada')
       ORDER BY updated_at DESC
       LIMIT 20`
    )
    .all(userId);
}

function followUpReminders(userId) {
  return db
    .prepare(
      `SELECT id, numero, client_nombre, total, estado, fecha, updated_at
       FROM quotes
       WHERE user_id = ? AND estado = 'enviada'
         AND updated_at <= datetime('now', '-7 days')
       ORDER BY updated_at ASC
       LIMIT 15`
    )
    .all(userId);
}

function recentActivity(userId) {
  const quotes = db
    .prepare(
      `SELECT 'quote' AS type, id, numero AS ref, client_nombre, estado, updated_at
       FROM quotes WHERE user_id = ?
       ORDER BY updated_at DESC LIMIT 10`
    )
    .all(userId);

  const invoices = db
    .prepare(
      `SELECT 'invoice' AS type, id, COALESCE(fiscal_number, numero) AS ref, client_nombre, estado, updated_at
       FROM invoices WHERE user_id = ? AND estado != 'anulada'
       ORDER BY updated_at DESC LIMIT 10`
    )
    .all(userId);

  return [...quotes, ...invoices]
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, 15);
}

function getNotifications(userId) {
  const overdue = overdueInvoices(userId);
  const pending = pendingQuotes(userId);
  const followUps = followUpReminders(userId);
  const activity = recentActivity(userId);

  return {
    overdueInvoices: overdue,
    pendingQuotes: pending,
    followUpReminders: followUps,
    recentActivity: activity,
    counts: {
      overdue: overdue.length,
      pendingQuotes: pending.length,
      followUps: followUps.length,
      total: overdue.length + followUps.length,
    },
  };
}

module.exports = { getNotifications };
