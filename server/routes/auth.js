const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const templateRepo = require('../templates/templateRepository');
const { authMiddleware } = require('../middleware/auth');
const { issueTokenPair, rotateRefreshToken, revokeRefreshToken } = require('../auth/tokenService');
const { changePasswordLocal, recoverPasswordLocal } = require('../auth/passwordService');

const router = express.Router();

router.post('/register', (req, res) => {
  const {
    nombre,
    email,
    password,
    razon_social,
    rnc,
    logo,
    direccion,
    telefono,
    emisor_email,
  } = req.body;

  if (!razon_social?.trim() || !rnc?.trim()) {
    return res.status(400).json({ error: 'Razón social y RNC son requeridos' });
  }
  if (!nombre?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({
      error: 'Nombre, email y contraseña (mín. 6 caracteres) son requeridos',
    });
  }
  if (logo && logo.length > 3_000_000) {
    return res.status(400).json({ error: 'El logo es demasiado grande (máx. ~2 MB)' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (nombre, email, password_hash) VALUES (?, ?, ?)')
    .run(nombre.trim(), email.trim().toLowerCase(), hash);
  const userId = result.lastInsertRowid;

  db.prepare(
    `INSERT INTO emisor_settings (user_id, nombre, rnc, logo, direccion, telefono, email)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    razon_social.trim(),
    rnc.trim(),
    logo || null,
    direccion?.trim() || null,
    telefono?.trim() || null,
    emisor_email?.trim() || null
  );

  templateRepo.ensureDefaultTemplate(userId);

  const { ensureDefaultCategories } = require('../expenses/migrateExpensesSchema');
  ensureDefaultCategories(db, userId);

  const user = { id: userId, nombre: nombre.trim(), email: email.trim().toLowerCase() };
  const tokens = issueTokenPair(user);
  res.status(201).json(tokens);
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const user = { id: row.id, nombre: row.nombre, email: row.email };
  res.json(issueTokenPair(user));
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken requerido' });
  }
  const tokens = rotateRefreshToken(refreshToken);
  if (!tokens) {
    return res.status(401).json({ error: 'Sesión expirada. Inicie sesión de nuevo.' });
  }
  res.json(tokens);
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  revokeRefreshToken(refreshToken);
  res.json({ ok: true });
});

router.post('/recover-password', (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    const result = recoverPasswordLocal(email, newPassword);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    const tokens = issueTokenPair(result.user);
    res.json({
      message: 'Contraseña restablecida correctamente',
      ...tokens,
    });
  } catch (err) {
    console.error('[auth] recover-password:', err);
    res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
});

router.post('/change-password', authMiddleware, (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Sesión inválida. Inicie sesión de nuevo.' });
    }
    const { currentPassword, newPassword } = req.body || {};
    const result = changePasswordLocal(userId, currentPassword, newPassword);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    const tokens = issueTokenPair(result.user);
    res.json({
      message: 'Contraseña actualizada correctamente',
      ...tokens,
    });
  } catch (err) {
    console.error('[auth] change-password:', err);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
});

module.exports = router;
