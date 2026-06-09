const bcrypt = require('bcryptjs');
const db = require('../db');
const { revokeAllUserRefreshTokens } = require('./tokenService');

function changePasswordLocal(userId, currentPassword, newPassword) {
  if (!currentPassword) {
    return { ok: false, error: 'La contraseña actual es requerida' };
  }
  if (!newPassword || String(newPassword).length < 6) {
    return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
  }
  if (currentPassword === newPassword) {
    return { ok: false, error: 'La nueva contraseña debe ser diferente a la actual' };
  }

  const row = db.prepare('SELECT id, nombre, email, password_hash FROM users WHERE id = ?').get(userId);
  if (!row) {
    return { ok: false, error: 'Usuario no encontrado' };
  }
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    return { ok: false, error: 'Contraseña actual incorrecta' };
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  revokeAllUserRefreshTokens(userId);

  return {
    ok: true,
    user: { id: row.id, nombre: row.nombre, email: row.email },
  };
}

function recoverPasswordLocal(email, newPassword) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return { ok: false, error: 'El email es requerido' };
  }
  if (!newPassword || String(newPassword).length < 6) {
    return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
  }

  const row = db
    .prepare('SELECT id, nombre, email FROM users WHERE email = ?')
    .get(normalizedEmail);

  if (!row) {
    return { ok: false, error: 'No existe una cuenta con ese email' };
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.id);
  revokeAllUserRefreshTokens(row.id);

  return {
    ok: true,
    user: { id: row.id, nombre: row.nombre, email: row.email },
  };
}

module.exports = { changePasswordLocal, recoverPasswordLocal };
