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
    logo: row.logo || null,
  };
}

router.get('/', (req, res) => {
  res.json(getEmisor(req.user.id));
});

router.put('/', (req, res) => {
  const { nombre, rnc, direccion, telefono, email, logo } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
  }
  if (logo && logo.length > 3_000_000) {
    return res.status(400).json({ error: 'El logo es demasiado grande (máx. ~2 MB)' });
  }
  const current = db.prepare('SELECT logo FROM emisor_settings WHERE user_id = ?').get(req.user.id);
  const logoValue = logo !== undefined ? logo || null : current?.logo || null;

  db.prepare(
    `INSERT INTO emisor_settings (user_id, nombre, rnc, direccion, telefono, email, logo, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       nombre=excluded.nombre,
       rnc=excluded.rnc,
       direccion=excluded.direccion,
       telefono=excluded.telefono,
       email=excluded.email,
       logo=excluded.logo,
       updated_at=datetime('now')`
  ).run(
    req.user.id,
    nombre.trim(),
    rnc?.trim() || null,
    direccion?.trim() || null,
    telefono?.trim() || null,
    email?.trim() || null,
    logoValue
  );
  res.json(getEmisor(req.user.id));
});

module.exports = router;
