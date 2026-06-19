const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { getEmisorRow, publicEmisorFields, readSmtpPassword } = require('../emisorSmtp');
const router = express.Router();
router.use(authMiddleware);

function getEmisor(userId) {
  return publicEmisorFields(getEmisorRow(userId));
}

router.get('/', (req, res) => {
  res.json(getEmisor(req.user.id));
});

router.put('/', (req, res) => {
  const { nombre, rnc, direccion, telefono, celular, email, logo, firma, sello, mensaje_pdf, smtp_user, smtp_password } =
    req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
  }
  const imageFields = [
    ['logo', logo],
    ['firma', firma],
    ['sello', sello],
  ];
  for (const [label, value] of imageFields) {
    if (value && value.length > 3_000_000) {
      return res.status(400).json({ error: `La imagen de ${label} es demasiado grande (máx. ~2 MB)` });
    }
  }

  const current = getEmisorRow(req.user.id);
  const logoValue = logo !== undefined ? logo || null : current?.logo || null;
  const firmaValue = firma !== undefined ? firma || null : current?.firma || null;
  const selloValue = sello !== undefined ? sello || null : current?.sello || null;
  const mensajePdfValue =
    mensaje_pdf !== undefined ? String(mensaje_pdf || '').trim() || null : current?.mensaje_pdf || null;
  const smtpUserValue = smtp_user !== undefined ? smtp_user?.trim() || null : current.smtp_user;
  let smtpPasswordValue = readSmtpPassword(current) || null;
  if (smtp_password !== undefined) {
    const raw = String(smtp_password);
    smtpPasswordValue = raw.length > 0 ? raw : null;
  }

  db.prepare(
    `INSERT INTO emisor_settings (user_id, nombre, rnc, direccion, telefono, celular, email, logo, firma, sello, mensaje_pdf, smtp_user, smtp_password, smtp_password_enc, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       nombre=excluded.nombre,
       rnc=excluded.rnc,
       direccion=excluded.direccion,
       telefono=excluded.telefono,
       celular=excluded.celular,
       email=excluded.email,
       logo=excluded.logo,
       firma=excluded.firma,
       sello=excluded.sello,
       mensaje_pdf=excluded.mensaje_pdf,
       smtp_user=excluded.smtp_user,
       smtp_password=excluded.smtp_password,
       smtp_password_enc=NULL,
       updated_at=datetime('now')`
  ).run(
    req.user.id,
    nombre.trim(),
    rnc?.trim() || null,
    direccion?.trim() || null,
    telefono?.trim() || null,
    celular?.trim() || null,
    email?.trim() || null,
    logoValue,
    firmaValue,
    selloValue,
    mensajePdfValue,
    smtpUserValue,
    smtpPasswordValue
  );
  res.json(getEmisor(req.user.id));
});

module.exports = router;
