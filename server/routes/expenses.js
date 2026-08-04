const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const expenseService = require('../expenses/expenseService');
const { ExpenseError } = require('../expenses/expenseService');

const router = express.Router();
router.use(authMiddleware);

function handleError(err, res) {
  if (err instanceof ExpenseError) {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  console.error(err);
  return res.status(500).json({ error: err.message || 'Error del servidor' });
}

router.get('/meta', (_req, res) => {
  res.json({ paymentMethods: expenseService.PAYMENT_METHODS });
});

router.get('/dashboard', (req, res) => {
  res.json(expenseService.dashboardStats(req.user.id));
});

router.get('/categories', (req, res) => {
  res.json(expenseService.ensureCategories(req.user.id));
});

router.post('/categories', (req, res) => {
  if (!req.body.name?.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
  }
  try {
    const cat = expenseService.repo.createCategory(req.user.id, req.body);
    res.status(201).json(cat);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre.' });
    }
    return handleError(err, res);
  }
});

router.put('/categories/:id', (req, res) => {
  const cat = expenseService.repo.getCategory(Number(req.params.id), req.user.id);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
  try {
    res.json(expenseService.repo.updateCategory(cat.id, req.user.id, req.body));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre.' });
    }
    return handleError(err, res);
  }
});

router.delete('/categories/:id', (req, res) => {
  const result = expenseService.repo.deleteCategory(Number(req.params.id), req.user.id);
  if (!result.ok) {
    return res.status(result.error ? 400 : 404).json({ error: result.error || 'No encontrada' });
  }
  res.json({ ok: true });
});

router.get('/projects', (req, res) => {
  res.json(expenseService.repo.listProjects(req.user.id));
});

router.post('/projects', (req, res) => {
  if (!req.body.name?.trim()) {
    return res.status(400).json({ error: 'El nombre del proyecto es obligatorio.' });
  }
  const project = expenseService.repo.createProject(req.user.id, req.body);
  res.status(201).json(project);
});

router.get('/reports/summary', (req, res) => {
  const filters = {
    from: req.query.from,
    to: req.query.to,
    category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
    quote_id: req.query.quote_id ? Number(req.query.quote_id) : undefined,
  };
  res.json(expenseService.reportSummary(req.user.id, filters));
});

router.get('/reports/income-statement', (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  if (!from || !to) {
    return res.status(400).json({ error: 'Indique fecha inicio y fin.' });
  }
  res.json(expenseService.incomeStatement(req.user.id, from, to));
});

router.get('/reports/export', (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();
  const filters = {
    from: req.query.from,
    to: req.query.to,
    category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
  };
  const { contentType, body } = expenseService.exportReport(req.user.id, filters, format);
  const ext = format === 'pdf' ? 'html' : 'csv';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="gastos-${Date.now()}.${ext}"`);
  res.send(body);
});

router.get('/', (req, res) => {
  const filters = {
    from: req.query.from,
    to: req.query.to,
    category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
    quote_id: req.query.quote_id ? Number(req.query.quote_id) : undefined,
    invoice_id: req.query.invoice_id ? Number(req.query.invoice_id) : undefined,
  };
  res.json(expenseService.repo.listExpenses(req.user.id, filters));
});

router.get('/:id', (req, res) => {
  const row = expenseService.repo.getExpense(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json(row);
});

router.post('/', (req, res) => {
  try {
    expenseService.validateExpensePayload(req.body);
    const cat = expenseService.repo.getCategory(Number(req.body.category_id), req.user.id);
    if (!cat) return res.status(400).json({ error: 'Categoría no válida.' });
    if (req.body.ncf?.trim()) {
      const dup = expenseService.repo.findExpenseByNcf(req.user.id, req.body.ncf);
      if (dup) {
        return res.status(400).json({
          error: `Ya existe un gasto (#${dup.id}, ${dup.expense_date}) con este mismo NCF. Verifique que no sea la misma factura antes de guardarla otra vez.`,
        });
      }
    }
    const expense = expenseService.repo.insertExpense(req.user.id, req.body, req.user.id);
    res.status(201).json(expense);
  } catch (err) {
    return handleError(err, res);
  }
});

router.put('/:id', (req, res) => {
  const existing = expenseService.repo.getExpense(Number(req.params.id), req.user.id);
  if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });
  try {
    expenseService.validateExpensePayload(req.body, { partial: true });
    if (req.body.category_id) {
      const cat = expenseService.repo.getCategory(Number(req.body.category_id), req.user.id);
      if (!cat) return res.status(400).json({ error: 'Categoría no válida.' });
    }
    if (req.body.ncf !== undefined && req.body.ncf?.trim()) {
      const dup = expenseService.repo.findExpenseByNcf(req.user.id, req.body.ncf, existing.id);
      if (dup) {
        return res.status(400).json({
          error: `Ya existe otro gasto (#${dup.id}, ${dup.expense_date}) con este mismo NCF.`,
        });
      }
    }
    const payload = {
      category_id: req.body.category_id ?? existing.category_id,
      quote_id: req.body.quote_id !== undefined ? req.body.quote_id : existing.quote_id,
      invoice_id: req.body.invoice_id !== undefined ? req.body.invoice_id : existing.invoice_id,
      client_id: req.body.client_id !== undefined ? req.body.client_id : existing.client_id,
      project_id: req.body.project_id !== undefined ? req.body.project_id : existing.project_id,
      rnc: req.body.rnc !== undefined ? req.body.rnc : existing.rnc,
      ncf: req.body.ncf !== undefined ? req.body.ncf : existing.ncf,
      expense_date: req.body.expense_date ?? existing.expense_date,
      description: req.body.description ?? existing.description,
      reference_number: req.body.reference_number ?? existing.reference_number,
      amount: req.body.amount ?? existing.amount,
      itbis: req.body.itbis !== undefined ? req.body.itbis : existing.itbis,
      payment_method: req.body.payment_method ?? existing.payment_method,
      notes: req.body.notes ?? existing.notes,
      attachment_name: req.body.attachment_name,
      attachment_mime: req.body.attachment_mime,
      attachment_data: req.body.attachment_data,
    };
    res.json(expenseService.repo.updateExpense(existing.id, req.user.id, payload));
  } catch (err) {
    return handleError(err, res);
  }
});

router.delete('/:id', (req, res) => {
  const ok = expenseService.repo.deleteExpense(Number(req.params.id), req.user.id);
  if (!ok) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json({ ok: true });
});

module.exports = router;
