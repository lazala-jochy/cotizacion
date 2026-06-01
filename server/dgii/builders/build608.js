const { periodDateRange } = require('../utils/validatePeriod');
const { validateNcf, validateAnnulmentReason } = require('../utils/validateNcf');
const { formatDateYmd, buildPipeFile } = require('../utils/generateTxt');
const { MAX_RECORDS_608 } = require('../constants');

function listCancelledFor608(userId, period) {
  const db = require('../../db');
  const { start, end } = periodDateRange(period);
  return db
    .prepare(
      `SELECT i.id, i.fiscal_number, i.fecha_emision, i.serie,
        COALESCE(ci.cancel_reason, '04') AS cancel_reason,
        COALESCE(ci.cancelled_at, i.updated_at) AS cancelled_at
       FROM invoices i
       LEFT JOIN cancelled_invoices ci ON ci.invoice_id = i.id
       WHERE i.user_id = ?
         AND i.estado = 'anulada'
         AND date(COALESCE(ci.cancelled_at, i.updated_at)) >= date(?)
         AND date(COALESCE(ci.cancelled_at, i.updated_at)) <= date(?)
       ORDER BY cancelled_at, i.id`
    )
    .all(userId, start, end);
}

function build608Preview(userId, period, emitterRnc) {
  const raw = listCancelledFor608(userId, period);
  const errors = [];
  const rows = [];

  for (const inv of raw) {
    const ncfCheck = validateNcf(inv.fiscal_number);
    if (!ncfCheck.ok) {
      errors.push({ invoiceId: inv.id, error: ncfCheck.error });
      continue;
    }
    const reasonCheck = validateAnnulmentReason(inv.cancel_reason);
    if (!reasonCheck.ok) {
      errors.push({ invoiceId: inv.id, fiscalNumber: inv.fiscal_number, error: reasonCheck.error });
      continue;
    }
    rows.push({
      invoiceId: inv.id,
      fiscalNumber: ncfCheck.normalized,
      fechaComprobante: inv.fecha_emision,
      cancelReason: reasonCheck.code,
      cancelledAt: inv.cancelled_at,
    });
  }

  if (rows.length > MAX_RECORDS_608) {
    errors.push({
      error: `Supera el máximo de ${MAX_RECORDS_608} registros del formato 608.`,
    });
  }

  return {
    period,
    emitterRnc: emitterRnc || '',
    recordCount: rows.length,
    rows,
    errors,
  };
}

function build608DetailRow(row) {
  return [row.fiscalNumber, formatDateYmd(row.fechaComprobante), row.cancelReason];
}

function build608Txt(preview) {
  const header = [preview.emitterRnc || '', preview.period, String(preview.recordCount)];
  const detailLines = preview.rows.map(build608DetailRow);
  return buildPipeFile({ headerLine: header.join('|'), detailLines });
}

module.exports = {
  listCancelledFor608,
  build608Preview,
  build608Txt,
};
