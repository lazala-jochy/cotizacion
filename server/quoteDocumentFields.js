const db = require('./db');

function getUserNombre(userId) {
  const row = db.prepare('SELECT nombre FROM users WHERE id = ?').get(userId);
  return row?.nombre?.trim() || '';
}

/** Completa campos del PDF cuando la cotización es antigua o se guardó vacío. */
function fillQuoteDocumentFields(quote, userId) {
  if (!quote) return quote;
  const filled = { ...quote };
  if (!String(filled.ejecutivo || '').trim()) {
    filled.ejecutivo = getUserNombre(userId);
  }
  if (!String(filled.forma_pago || '').trim()) {
    filled.forma_pago = 'Efectivo / Transferencia';
  }
  return filled;
}

module.exports = { getUserNombre, fillQuoteDocumentFields };
