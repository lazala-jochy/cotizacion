const { periodDateRange } = require('../utils/validatePeriod');
const { resolveBuyerIdentification } = require('../utils/identifyTaxId');
const { formatAmount, formatDateYmd, buildPipeFile } = require('../utils/generateTxt');
const { MAX_RECORDS_607 } = require('../constants');

function listSalesFor607(userId, period) {
  const db = require('../../db');
  const { start, end } = periodDateRange(period);
  return db
    .prepare(
      `SELECT i.*, dt.code AS document_type_code, dt.requires_tax_id
       FROM invoices i
       LEFT JOIN fiscal_document_types dt ON dt.id = i.fiscal_document_type_id
       WHERE i.user_id = ?
         AND i.estado != 'anulada'
         AND i.fecha_emision >= ?
         AND i.fecha_emision <= ?
       ORDER BY i.fecha_emision, i.id`
    )
    .all(userId, start, end);
}

function build607Preview(userId, period, emitterRnc) {
  const rows = listSalesFor607(userId, period);
  const errors = [];
  const details = [];

  for (const inv of rows) {
    const idInfo = resolveBuyerIdentification(inv.client_rnc, Boolean(inv.requires_tax_id));
    if (!idInfo.ok) {
      errors.push({ invoiceId: inv.id, fiscalNumber: inv.fiscal_number, error: idInfo.error });
      continue;
    }

    const montoFacturado = Math.max(0, Number(inv.subtotal) - Number(inv.descuento || 0));
    const itbis = Number(inv.itbis) || 0;

    details.push({
      invoiceId: inv.id,
      fiscalNumber: inv.fiscal_number,
      documentTypeCode: inv.document_type_code || inv.serie,
      clientNombre: inv.client_nombre,
      idType: idInfo.idType,
      idValue: idInfo.idValue,
      fechaComprobante: inv.fecha_emision,
      montoFacturado,
      itbisFacturado: itbis,
      itbisRetenido: 0,
      isrRetenido: 0,
      tipoIngreso: '01',
      ncfModificado: '',
      fechaRetencion: '',
      formaPago: inv.forma_pago || '',
      total: Number(inv.total) || 0,
    });
  }

  if (details.length > MAX_RECORDS_607) {
    errors.push({
      error: `El período supera el máximo de ${MAX_RECORDS_607} registros del formato 607.`,
    });
  }

  const preview = {
    period,
    emitterRnc: emitterRnc || '',
    recordCount: details.length,
    totals: {
      montoFacturado: details.reduce((s, r) => s + r.montoFacturado, 0),
      itbisFacturado: details.reduce((s, r) => s + r.itbisFacturado, 0),
    },
    rows: details,
    errors,
  };
  preview.txt = build607Txt(preview);
  return preview;
}

/**
 * Línea detalle 607 (post mayo 2018) — campos principales según instructivo DGII.
 * Validar con plantilla oficial y pre-validador antes de envío OFV.
 */
function build607DetailRow(row) {
  return [
    row.idValue || '',
    row.idType || '',
    row.tipoIngreso || '01',
    row.fiscalNumber || '',
    row.ncfModificado || '',
    formatDateYmd(row.fechaComprobante),
    formatDateYmd(row.fechaRetencion),
    formatAmount(row.montoFacturado),
    formatAmount(row.itbisFacturado),
    formatAmount(row.itbisRetenido),
    formatAmount(row.isrRetenido),
    '0',
    '0',
    '0',
    '0',
    '0',
    '0',
    '0',
    formatAmount(row.montoFacturado),
    '0',
    '0',
    '0',
    '0',
  ];
}

function build607Txt(preview) {
  const header = [
    preview.emitterRnc || '',
    preview.period,
    String(preview.recordCount),
  ];
  const detailLines = preview.rows.map(build607DetailRow);
  return buildPipeFile({ headerLine: header.join('|'), detailLines });
}

module.exports = {
  listSalesFor607,
  build607Preview,
  build607Txt,
};
