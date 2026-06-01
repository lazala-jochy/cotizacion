const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');
const templateRepo = require('../templates/templateRepository');

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
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.status(201).json({ user, token });
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
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ user, token });
});

module.exports = router;
