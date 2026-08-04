const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const dgiiService = require('../dgii/dgiiService');
const { DgiiError } = require('../dgii/dgiiService');
const dgiiRepo = require('../dgii/dgiiRepository');
const { validatePeriod } = require('../dgii/utils/validatePeriod');
const { validateNcf } = require('../dgii/utils/validateNcf');

const router = express.Router();
router.use(authMiddleware);

function handleDgiiError(err, res) {
  if (err instanceof DgiiError) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  console.error(err);
  return res.status(500).json({ error: err.message || 'Error del servidor' });
}

router.get('/catalogs', (_req, res) => {
  res.json(dgiiService.catalogs);
});

router.get('/reports', (req, res) => {
  const list = dgiiRepo.listReports(req.user.id, {
    report_type: req.query.report_type,
  });
  res.json(
    list.map((r) => ({
      ...r,
      filename: path.basename(r.file_path),
    }))
  );
});

router.get('/reports/:id/download', (req, res) => {
  const report = dgiiRepo.getReportById(Number(req.params.id), req.user.id);
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
  try {
    const content = dgiiService.readReportFile(report);
    const filename = path.basename(report.file_path);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.delete('/reports/:id', (req, res) => {
  try {
    dgiiService.deleteReport(req.user.id, Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.post('/backfill-cancelled', (req, res) => {
  dgiiService.backfillCancelledInvoices(req.user.id);
  res.json({ ok: true });
});

router.get('/607/preview', (req, res) => {
  try {
    res.json(dgiiService.preview607(req.user.id, req.query.period));
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.post('/607/export', (req, res) => {
  try {
    const period = req.body.period || req.query.period;
    const result = dgiiService.export607(req.user.id, period);
    res.status(201).json(result);
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.get('/608/preview', (req, res) => {
  try {
    res.json(dgiiService.preview608(req.user.id, req.query.period));
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.post('/608/export', (req, res) => {
  try {
    const period = req.body.period || req.query.period;
    const result = dgiiService.export608(req.user.id, period);
    res.status(201).json(result);
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.get('/606/preview', (req, res) => {
  try {
    res.json(dgiiService.preview606(req.user.id, req.query.period));
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.post('/606/export', (req, res) => {
  try {
    const period = req.body.period || req.query.period;
    const result = dgiiService.export606(req.user.id, period);
    res.status(201).json(result);
  } catch (err) {
    return handleDgiiError(err, res);
  }
});

router.get('/606/purchases', (req, res) => {
  const p = validatePeriod(req.query.period);
  if (!p.ok) return res.status(400).json({ error: p.error });
  const build606 = require('../dgii/builders/build606');
  res.json(build606.list606PeriodEntries(req.user.id, p.period));
});

router.post('/606/purchases', (req, res) => {
  const ncfCheck = validateNcf(req.body.ncf);
  if (!ncfCheck.ok) return res.status(400).json({ error: ncfCheck.error });
  if (!req.body.fecha_comprobante) {
    return res.status(400).json({ error: 'La fecha del comprobante es requerida.' });
  }
  const purchase = dgiiRepo.createPurchase(req.user.id, {
    ...req.body,
    ncf: ncfCheck.normalized,
  });
  res.status(201).json(purchase);
});

router.delete('/606/purchases/:id', (req, res) => {
  const ok = dgiiRepo.removePurchase(Number(req.params.id), req.user.id);
  if (!ok) return res.status(404).json({ error: 'Compra no encontrada' });
  res.json({ ok: true });
});

router.get('/606/suppliers', (req, res) => {
  res.json(dgiiRepo.listSuppliers(req.user.id));
});

router.post('/606/suppliers', (req, res) => {
  if (!req.body.nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del proveedor es requerido.' });
  }
  const supplier = dgiiRepo.createSupplier(req.user.id, req.body);
  res.status(201).json(supplier);
});

module.exports = router;
