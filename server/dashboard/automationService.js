const db = require('../db');

const DEFAULTS = {
  auto_send_quotes: 0,
  payment_reminders: 1,
  quote_follow_up: 1,
  follow_up_days: 7,
  reminder_days_before: 3,
};

function ensureAutomationRow(userId) {
  const row = db.prepare('SELECT * FROM automation_settings WHERE user_id = ?').get(userId);
  if (row) return row;
  db.prepare(
    `INSERT INTO automation_settings (user_id, auto_send_quotes, payment_reminders, quote_follow_up, follow_up_days, reminder_days_before)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    DEFAULTS.auto_send_quotes,
    DEFAULTS.payment_reminders,
    DEFAULTS.quote_follow_up,
    DEFAULTS.follow_up_days,
    DEFAULTS.reminder_days_before
  );
  return db.prepare('SELECT * FROM automation_settings WHERE user_id = ?').get(userId);
}

function getSettings(userId) {
  const row = ensureAutomationRow(userId);
  return {
    autoSendQuotes: Boolean(row.auto_send_quotes),
    paymentReminders: Boolean(row.payment_reminders),
    quoteFollowUp: Boolean(row.quote_follow_up),
    followUpDays: Number(row.follow_up_days) || 7,
    reminderDaysBefore: Number(row.reminder_days_before) || 3,
    lastRunAt: row.last_run_at || null,
  };
}

function updateSettings(userId, body) {
  ensureAutomationRow(userId);
  const autoSendQuotes = body.autoSendQuotes ? 1 : 0;
  const paymentReminders = body.paymentReminders !== false ? 1 : 0;
  const quoteFollowUp = body.quoteFollowUp !== false ? 1 : 0;
  const followUpDays = Math.max(1, Number(body.followUpDays) || 7);
  const reminderDaysBefore = Math.max(1, Number(body.reminderDaysBefore) || 3);

  db.prepare(
    `UPDATE automation_settings SET
       auto_send_quotes = ?,
       payment_reminders = ?,
       quote_follow_up = ?,
       follow_up_days = ?,
       reminder_days_before = ?,
       updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(autoSendQuotes, paymentReminders, quoteFollowUp, followUpDays, reminderDaysBefore, userId);

  return getSettings(userId);
}

/** Tareas pendientes detectadas por automatizaciones (no envía emails aquí). */
function getAutomationTasks(userId) {
  const settings = getSettings(userId);
  const tasks = [];

  if (settings.paymentReminders) {
    const due = db
      .prepare(
        `SELECT id, numero, fiscal_number, client_nombre, fecha_vencimiento
         FROM invoices
         WHERE user_id = ? AND estado IN ('pendiente', 'parcial')
           AND fecha_vencimiento IS NOT NULL
           AND fecha_vencimiento <= date('now', '+' || ? || ' days')
           AND fecha_vencimiento >= date('now')`
      )
      .all(userId, settings.reminderDaysBefore);
    for (const inv of due) {
      tasks.push({
        type: 'payment_reminder',
        ref: inv.fiscal_number || inv.numero,
        client: inv.client_nombre,
        dueDate: inv.fecha_vencimiento,
        invoiceId: inv.id,
      });
    }
  }

  if (settings.quoteFollowUp) {
    const stale = db
      .prepare(
        `SELECT id, numero, client_nombre, updated_at
         FROM quotes
         WHERE user_id = ? AND estado = 'enviada'
           AND updated_at <= datetime('now', '-' || ? || ' days')`
      )
      .all(userId, settings.followUpDays);
    for (const q of stale) {
      tasks.push({
        type: 'quote_follow_up',
        ref: q.numero,
        client: q.client_nombre,
        quoteId: q.id,
        since: q.updated_at,
      });
    }
  }

  return { settings, tasks };
}

function markAutomationRun(userId) {
  db.prepare(
    `UPDATE automation_settings SET last_run_at = datetime('now') WHERE user_id = ?`
  ).run(userId);
}

module.exports = {
  getSettings,
  updateSettings,
  getAutomationTasks,
  markAutomationRun,
};
