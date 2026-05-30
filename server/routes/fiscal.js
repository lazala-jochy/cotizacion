const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const fiscalRangeRepo = require('../invoices/fiscalRangeRepository');
const { validateRangePayload } = require('../invoices/fiscalValidation');
const { formatFiscalNumber } = require('../invoices/fiscalNumber');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json(fiscalRangeRepo.listByUser(req.user.id));
});

router.get('/active', (req, res) => {
  const range = fiscalRangeRepo.getActiveRange(req.user.id);
  if (!range) return res.status(404).json({ error: 'No hay rango fiscal activo' });
  res.json(range);
});

router.get('/:id', (req, res) => {
  const range = fiscalRangeRepo.getById(Number(req.params.id), req.user.id);
  if (!range) return res.status(404).json({ error: 'Rango no encontrado' });
  res.json(range);
});

router.post('/', (req, res) => {
  const err = validateRangePayload(req.body);
  if (err) return res.status(400).json({ error: err });
  const range = fiscalRangeRepo.create(req.user.id, req.body);
  res.status(201).json(range);
});

router.put('/:id', (req, res) => {
  const err = validateRangePayload(req.body);
  if (err) return res.status(400).json({ error: err });
  const range = fiscalRangeRepo.update(Number(req.params.id), req.user.id, req.body);
  if (!range) return res.status(404).json({ error: 'Rango no encontrado' });
  res.json(range);
});

router.get('/:id/preview-next', (req, res) => {
  const range = fiscalRangeRepo.getById(Number(req.params.id), req.user.id);
  if (!range) return res.status(404).json({ error: 'Rango no encontrado' });
  const next = range.ultimo_numero_utilizado + 1;
  res.json({
    next_secuencia: next,
    fiscal_number: formatFiscalNumber(range.serie, next),
  });
});

module.exports = router;
