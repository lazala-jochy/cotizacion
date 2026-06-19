const db = require('./db');
const { decrypt } = require('./utils/credentials');
function getEmisorRow(userId) {
  let row = db.prepare('SELECT * FROM emisor_settings WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO emisor_settings (user_id, nombre) VALUES (?, ?)').run(userId, '');
    row = db.prepare('SELECT * FROM emisor_settings WHERE user_id = ?').get(userId);
  }
  return row;
}

function readSmtpPassword(row) {
  if (row.smtp_password) return String(row.smtp_password);
  if (row.smtp_password_enc) return decrypt(row.smtp_password_enc) || '';
  return '';
}

function publicEmisorFields(row) {
  const smtpUser = (row.smtp_user || '').trim();
  const smtpPassword = readSmtpPassword(row);
  return {
    nombre: row.nombre || '',
    rnc: row.rnc || '',
    direccion: row.direccion || '',
    telefono: row.telefono || '',
    email: row.email || '',
    logo: row.logo || null,
    firma: row.firma || null,
    sello: row.sello || null,
    mensaje_pdf: row.mensaje_pdf || '',
    smtp_user: row.smtp_user || '',
    smtp_password: smtpPassword,
    smtp_configured: Boolean(smtpUser && smtpPassword),
  };
}

function getSmtpCredentials(userId) {
  const row = getEmisorRow(userId);
  const user = row.smtp_user?.trim();
  const password = readSmtpPassword(row);
  if (!user || !password) return null;
  return { user, password };
}

module.exports = { getEmisorRow, publicEmisorFields, getSmtpCredentials, readSmtpPassword };
