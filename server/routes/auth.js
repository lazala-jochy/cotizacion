const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');

const router = express.Router();

router.post('/register', (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({
      error: 'Nombre, email y contraseña (mín. 6 caracteres) son requeridos',
    });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (nombre, email, password_hash) VALUES (?, ?, ?)')
    .run(nombre.trim(), email.trim().toLowerCase(), hash);
  const user = { id: result.lastInsertRowid, nombre: nombre.trim(), email: email.trim().toLowerCase() };
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
