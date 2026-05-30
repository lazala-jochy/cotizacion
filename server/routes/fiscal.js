const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const fiscalDocumentTypeRepo = require('../invoices/fiscalDocumentTypeRepository');
const fiscalSequenceRepo = require('../invoices/fiscalSequenceRepository');
const { validateSequencePayload } = require('../invoices/fiscalValidation');
const { formatFiscalNumber } = require('../invoices/fiscalNumber');
const { previewNextFiscalNumber } = require('../invoices/invoiceService');

const router = express.Router();
router.use(authMiddleware);

router.get('/document-types', (req, res) => {
  res.json(fiscalDocumentTypeRepo.listActive());
});

router.get('/document-types/:typeId/preview-next', (req, res) => {
  try {
    const typeId = Number(req.params.typeId);
    const preview = previewNextFiscalNumber(req.user.id, typeId);
    res.json(preview);
  } catch (err) {
    const status = err.code === 'FISCAL_RANGE' || err.code === 'FISCAL_DOCUMENT_TYPE' ? 400 : 400;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

router.get('/sequences', (req, res) => {
  res.json(fiscalSequenceRepo.listByUser(req.user.id));
});

router.post('/sequences', (req, res) => {
  const err = validateSequencePayload(req.body);
  if (err) return res.status(400).json({ error: err });
  const sequence = fiscalSequenceRepo.create(req.user.id, req.body);
  res.status(201).json(sequence);
});

router.put('/sequences/:id', (req, res) => {
  const existing = fiscalSequenceRepo.getById(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Rango no encontrado' });
  const body = {
    ...req.body,
    fiscal_document_type_id: req.body.fiscal_document_type_id ?? existing.fiscal_document_type_id,
    start_number: req.body.start_number ?? req.body.numero_inicial ?? existing.start_number,
    end_number: req.body.end_number ?? req.body.numero_final ?? existing.end_number,
    last_used_number:
      req.body.last_used_number ?? req.body.ultimo_numero_utilizado ?? existing.last_used_number,
  };
  const err = validateSequencePayload(body);
  if (err) return res.status(400).json({ error: err });
  const sequence = fiscalSequenceRepo.update(Number(req.params.id), req.user.id, req.body);
  res.json(sequence);
});

router.get('/sequences/:id/preview-next', (req, res) => {
  const sequence = fiscalSequenceRepo.getById(Number(req.params.id), req.user.id);
  if (!sequence) return res.status(404).json({ error: 'Rango no encontrado' });
  const next = sequence.last_used_number + 1;
  res.json({
    next_secuencia: next,
    fiscal_number: formatFiscalNumber(sequence.document_type_code, next),
    document_type_code: sequence.document_type_code,
  });
});

/** Compatibilidad: listado de rangos (secuencias) */
router.get('/', (req, res) => {
  res.json(fiscalSequenceRepo.listByUser(req.user.id));
});

router.get('/active', (req, res) => {
  const all = fiscalSequenceRepo.listByUser(req.user.id);
  const active = all.filter((s) => s.is_active);
  if (!active.length) return res.status(404).json({ error: 'No hay rangos fiscales activos' });
  res.json(active);
});

router.get('/:id', (req, res) => {
  const sequence = fiscalSequenceRepo.getById(Number(req.params.id), req.user.id);
  if (!sequence) return res.status(404).json({ error: 'Rango no encontrado' });
  res.json(sequence);
});

router.post('/', (req, res) => {
  const body = { ...req.body };
  if (!body.fiscal_document_type_id && body.serie) {
    const dt = fiscalDocumentTypeRepo.getByCode(body.serie);
    if (dt) body.fiscal_document_type_id = dt.id;
  }
  const err = validateSequencePayload(body);
  if (err) return res.status(400).json({ error: err });
  const sequence = fiscalSequenceRepo.create(req.user.id, {
    fiscal_document_type_id: body.fiscal_document_type_id,
    start_number: body.start_number ?? body.numero_inicial,
    end_number: body.end_number ?? body.numero_final,
    last_used_number: body.last_used_number ?? body.ultimo_numero_utilizado,
    expiration_date: body.expiration_date ?? body.fecha_vencimiento,
    is_active: body.is_active ?? (body.estado !== 'inactivo'),
  });
  res.status(201).json(sequence);
});

router.put('/:id', (req, res) => {
  const existing = fiscalSequenceRepo.getById(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Rango no encontrado' });
  const body = {
    fiscal_document_type_id: req.body.fiscal_document_type_id ?? existing.fiscal_document_type_id,
    start_number: req.body.start_number ?? req.body.numero_inicial,
    end_number: req.body.end_number ?? req.body.numero_final,
    last_used_number: req.body.last_used_number ?? req.body.ultimo_numero_utilizado,
    expiration_date: req.body.expiration_date ?? req.body.fecha_vencimiento,
    is_active:
      req.body.is_active ??
      (req.body.estado !== undefined ? req.body.estado === 'activo' : undefined),
  };
  const err = validateSequencePayload(body);
  if (err) return res.status(400).json({ error: err });
  const sequence = fiscalSequenceRepo.update(Number(req.params.id), req.user.id, body);
  res.json(sequence);
});

router.get('/:id/preview-next', (req, res) => {
  const sequence = fiscalSequenceRepo.getById(Number(req.params.id), req.user.id);
  if (!sequence) return res.status(404).json({ error: 'Rango no encontrado' });
  const next = sequence.last_used_number + 1;
  res.json({
    next_secuencia: next,
    fiscal_number: formatFiscalNumber(sequence.document_type_code, next),
  });
});

module.exports = router;
