const db = require('../db');
const { normalizeEstado } = require('../quoteWorkflow');

/** Columnas del pipeline comercial → estados internos de cotización. */
const PIPELINE_STAGES = [
  { id: 'nueva', label: 'Nueva', estados: ['creada'] },
  { id: 'negociacion', label: 'En negociación', estados: ['enviada', 'en_proceso'] },
  { id: 'aprobada', label: 'Aprobada', estados: ['aprobada', 'aceptada'] },
  { id: 'facturada', label: 'Facturada', estados: ['completada'] },
  { id: 'cobrada', label: 'Cobrada', estados: ['pago_parcial', 'pagada'] },
];

const STAGE_TO_ESTADO = {
  nueva: 'creada',
  negociacion: 'enviada',
  aprobada: 'aprobada',
  facturada: 'completada',
  cobrada: 'pagada',
};

function resolvePipelineStage(quote, hasInvoice) {
  const estado = normalizeEstado(quote.estado);
  if (estado === 'cancelada') return null;
  if (['pagada', 'pago_parcial'].includes(estado)) return 'cobrada';
  if (hasInvoice || estado === 'completada') return 'facturada';
  if (['aprobada', 'aceptada'].includes(estado)) return 'aprobada';
  if (['enviada', 'en_proceso'].includes(estado)) return 'negociacion';
  return 'nueva';
}

function getPipelineBoard(userId) {
  const quotes = db
    .prepare(
      `SELECT q.*,
         (SELECT COUNT(*) FROM invoices i WHERE i.quote_id = q.id AND i.estado != 'anulada') AS invoice_count
       FROM quotes q
       WHERE q.user_id = ? AND q.estado != 'cancelada'
       ORDER BY q.updated_at DESC`
    )
    .all(userId);

  const columns = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    quotes: [],
    total: 0,
  }));

  const colMap = Object.fromEntries(columns.map((c) => [c.id, c]));

  for (const q of quotes) {
    const hasInvoice = Number(q.invoice_count) > 0;
    const stageId = resolvePipelineStage(q, hasInvoice);
    if (!stageId || !colMap[stageId]) continue;
    colMap[stageId].quotes.push({
      id: q.id,
      numero: q.numero,
      client_nombre: q.client_nombre,
      total: q.total,
      estado: normalizeEstado(q.estado),
      fecha: q.fecha,
      updated_at: q.updated_at,
      hasInvoice,
    });
    colMap[stageId].total += Number(q.total) || 0;
  }

  return { stages: PIPELINE_STAGES, columns };
}

function moveQuoteToStage(userId, quoteId, stageId) {
  if (!STAGE_TO_ESTADO[stageId]) {
    throw new Error('Etapa de pipeline inválida');
  }
  const quote = db
    .prepare('SELECT id, estado FROM quotes WHERE id = ? AND user_id = ?')
    .get(quoteId, userId);
  if (!quote) throw new Error('Cotización no encontrada');

  const newEstado = STAGE_TO_ESTADO[stageId];
  db.prepare(
    `UPDATE quotes SET estado = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(newEstado, quoteId, userId);

  return { id: quoteId, estado: newEstado, stageId };
}

module.exports = {
  PIPELINE_STAGES,
  getPipelineBoard,
  moveQuoteToStage,
};
