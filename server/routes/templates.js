const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const templateRepo = require('../templates/templateRepository');
const { renderTemplateDocumentHtml } = require('../../shared/template-designer/dist/renderTemplateHtml');
const { buildPlaceholderContext } = require('../../shared/template-designer/dist/placeholders');
const { normalizeTemplateDefinition } = require('../../shared/template-designer/dist/normalizeTemplateDefinition');
const { countQuoteItems } = require('../../shared/template-designer/dist/resolveTemplateLayout');
const { getEmisorRow, publicEmisorFields } = require('../emisorSmtp');
const { getQuoteWithItems } = require('./quotesTemplateHelpers');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  templateRepo.ensureDefaultTemplate(req.user.id);
  res.json(templateRepo.listByUser(req.user.id));
});

router.get('/default', (req, res) => {
  res.json(templateRepo.ensureDefaultTemplate(req.user.id));
});

router.get('/:id', (req, res) => {
  const row = templateRepo.getById(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { name, definition, isDefault } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  if (!definition?.elements) return res.status(400).json({ error: 'Definición inválida' });
  const created = templateRepo.create(req.user.id, {
    name,
    definition,
    isDefault: Boolean(isDefault),
  });
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, definition, isDefault } = req.body;
  if (definition !== undefined) {
    try {
      templateRepo.prepareDefinitionForStorage(definition);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Definición inválida' });
    }
  }
  const updated = templateRepo.update(id, req.user.id, { name, definition, isDefault });
  if (!updated) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json(updated);
});

router.post('/:id/duplicate', (req, res) => {
  const copy = templateRepo.duplicate(Number(req.params.id), req.user.id);
  if (!copy) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.status(201).json(copy);
});

router.post('/:id/set-default', (req, res) => {
  const row = templateRepo.setDefault(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const list = templateRepo.listByUser(req.user.id);
  if (list.length <= 1) {
    return res.status(400).json({ error: 'Debe existir al menos una plantilla' });
  }
  const ok = templateRepo.remove(Number(req.params.id), req.user.id);
  if (!ok) return res.status(404).json({ error: 'Plantilla no encontrada' });
  res.json({ ok: true });
});

/** Vista previa HTML con datos de ejemplo o de una cotización */
router.post('/:id/preview', (req, res) => {
  const template = templateRepo.getById(Number(req.params.id), req.user.id);
  if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });

  const fromEditor = req.body?.definition;
  const definition = normalizeTemplateDefinition(
    fromEditor ? { ...fromEditor, layoutLocked: true } : template.definition,
    fromEditor ? { allowAugment: false } : {}
  );

  const emisor = publicEmisorFields(getEmisorRow(req.user.id));
  let quote = req.body?.quote;
  if (req.body?.quoteId) {
    quote = getQuoteWithItems(req.body.quoteId, req.user.id);
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  }
  if (!quote) {
    quote = sampleQuote(emisor);
  }

  const docType = req.body?.documentType === 'invoice' ? 'invoice' : 'quote';
  const context = buildPlaceholderContext(quote, emisor, {
    documentType: docType,
    estadoLabel: req.body?.estadoLabel,
  });
  const title =
    docType === 'invoice'
      ? `Factura ${quote.fiscal_number || quote.numero || ''}`
      : 'Vista previa';
  const html = renderTemplateDocumentHtml(definition, context, title, {
    itemCount: countQuoteItems(quote.items),
  });
  res.json({ html });
});

function sampleQuote(emisor) {
  return {
    numero: 'COT-2026-0001',
    fecha: new Date().toISOString().slice(0, 10),
    validez_dias: 30,
    client_nombre: 'Cliente de ejemplo',
    client_rnc: '000000000',
    client_direccion: 'Santo Domingo',
    client_telefono: '809-000-0000',
    client_email: 'cliente@ejemplo.com',
    subtotal: 10000,
    itbis: 1800,
    total: 11800,
    notas: 'Vista previa del diseñador.',
    ejecutivo: 'Ejecutivo demo',
    forma_pago: 'Transferencia',
    estado: 'creada',
    items: [
      { descripcion: 'Servicio profesional', cantidad: 1, precio_unitario: 10000, total: 10000 },
    ],
  };
}

module.exports = router;
