/** Tareas DGII al arranque (evita dependencia circular con db.js). */
function runDgiiStartupTasks() {
  const db = require('../db');
  try {
    const { backfillCancelledInvoices } = require('./dgiiService');
    const users = db.prepare('SELECT id FROM users').all();
    for (const u of users) backfillCancelledInvoices(u.id);
  } catch (err) {
    console.warn('[dgii] backfill cancelled:', err.message);
  }
}

module.exports = { runDgiiStartupTasks };
