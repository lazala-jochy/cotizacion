const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const clients = db
    .prepare(
      `SELECT * FROM clients WHERE user_id = ? ORDER BY nombre COLLATE NOCASE`
    )
    .all(req.user.id);
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db
    .prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(client);
});

router.post('/', (req, res) => {
  const { nombre, rnc, direccion, telefono, email, notas } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del cliente es requerido' });
  }
  const result = db
    .prepare(
      `INSERT INTO clients (user_id, nombre, rnc, direccion, telefono, email, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      nombre.trim(),
      rnc?.trim() || null,
      direccion?.trim() || null,
      telefono?.trim() || null,
      email?.trim() || null,
      notas?.trim() || null
    );
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

  const { nombre, rnc, direccion, telefono, email, notas } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del cliente es requerido' });
  }
  db.prepare(
    `UPDATE clients SET nombre=?, rnc=?, direccion=?, telefono=?, email=?, notas=?, updated_at=datetime('now')
     WHERE id=? AND user_id=?`
  ).run(
    nombre.trim(),
    rnc?.trim() || null,
    direccion?.trim() || null,
    telefono?.trim() || null,
    email?.trim() || null,
    notas?.trim() || null,
    req.params.id,
    req.user.id
  );
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(client);
});

router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM clients WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ ok: true });
});

module.exports = router;
