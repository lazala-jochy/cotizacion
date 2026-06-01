const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const expenseService = require('../expenses/expenseService');

const router = express.Router();
router.use(authMiddleware);

router.get('/quotes/:id/profitability', (req, res) => {
  const data = expenseService.getQuoteProfitability(Number(req.params.id), req.user.id);
  if (!data) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(data);
});

router.get('/invoices/:id/profitability', (req, res) => {
  const data = expenseService.getInvoiceProfitability(Number(req.params.id), req.user.id);
  if (!data) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(data);
});

module.exports = router;
