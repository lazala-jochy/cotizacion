const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function getEmisor(userId) {
  let row = db.prepare('SELECT * FROM emisor_settings WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare(
      'INSERT INTO emisor_settings (user_id, nombre) VALUES (?, ?)'
    ).run(userId, '');
    row = db.prepare('SELECT * FROM emisor_settings WHERE user_id = ?').get(userId);
  }
  return {
    nombre: row.nombre || '',
    rnc: row.rnc || '',
    direccion: row.direccion || '',
    telefono: row.telefono || '',
    email: row.email || '',
  };
}

router.get('/', (req, res) => {
  res.json(getEmisor(req.user.id));
});

router.put('/', (req, res) => {
  const { nombre, rnc, direccion, telefono, email } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del emisor es requerido' });
  }
  db.prepare(
    `INSERT INTO emisor_settings (user_id, nombre, rnc, direccion, telefono, email, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       nombre=excluded.nombre,
       rnc=excluded.rnc,
       direccion=excluded.direccion,
       telefono=excluded.telefono,
       email=excluded.email,
       updated_at=datetime('now')`
  ).run(
    req.user.id,
    nombre.trim(),
    rnc?.trim() || null,
    direccion?.trim() || null,
    telefono?.trim() || null,
    email?.trim() || null
  );
  res.json(getEmisor(req.user.id));
});

module.exports = router;
