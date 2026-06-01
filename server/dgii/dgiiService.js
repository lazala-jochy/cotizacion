const fs = require('fs');
const path = require('path');
const db = require('../db');
const { validatePeriod } = require('./utils/validatePeriod');
const { validateAnnulmentReason } = require('./utils/validateNcf');
const { writeTxtFile } = require('./utils/generateTxt');
const dgiiRepo = require('./dgiiRepository');
const build607 = require('./builders/build607');
const build608 = require('./builders/build608');
const build606 = require('./builders/build606');
const {
  DGII_ANNULMENT_REASONS,
  DGII_INCOME_TYPES,
  DGII_PURCHASE_GOODS_TYPES,
} = require('./constants');

class DgiiError extends Error {
  constructor(message, code = 'DGII_ERROR') {
    super(message);
    this.code = code;
  }
}

function getEmitterRnc(userId) {
  const row = db.prepare('SELECT rnc FROM emisor_settings WHERE user_id = ?').get(userId);
  return row?.rnc?.trim() || '';
}

function assertNoBlockingErrors(errors, recordCount = 0) {
  const global = (errors || []).filter((e) => !e.invoiceId && !e.purchaseId);
  if (global.length) {
    const msg = global
      .slice(0, 5)
      .map((e) => e.error)
      .join(' ');
    throw new DgiiError(msg || 'Hay errores de validación.', 'VALIDATION');
  }
  if (recordCount === 0 && (errors || []).length > 0) {
    const msg = errors
      .slice(0, 5)
      .map((e) => e.error)
      .join(' ');
    throw new DgiiError(msg || 'No hay registros válidos para exportar.', 'VALIDATION');
  }
}

function preview607(userId, period) {
  const p = validatePeriod(period);
  if (!p.ok) throw new DgiiError(p.error, 'INVALID_PERIOD');
  const emitterRnc = getEmitterRnc(userId);
  if (!emitterRnc) {
    throw new DgiiError('Configure el RNC de la empresa en Configuración.', 'MISSING_RNC');
  }
  return build607.build607Preview(userId, p.period, emitterRnc);
}

function export607(userId, period) {
  const preview = preview607(userId, period);
  assertNoBlockingErrors(preview.errors, preview.recordCount);
  const txt = build607.build607Txt(preview);
  const filePath = writeTxtFile(userId, '607', preview.period, txt);
  const report = dgiiRepo.insertReport(
    userId,
    '607',
    preview.period,
    filePath,
    preview.recordCount
  );
  return { preview, report, filePath, filename: path.basename(filePath) };
}

function preview608(userId, period) {
  const p = validatePeriod(period);
  if (!p.ok) throw new DgiiError(p.error, 'INVALID_PERIOD');
  const emitterRnc = getEmitterRnc(userId);
  if (!emitterRnc) {
    throw new DgiiError('Configure el RNC de la empresa en Configuración.', 'MISSING_RNC');
  }
  return build608.build608Preview(userId, p.period, emitterRnc);
}

function export608(userId, period) {
  const preview = preview608(userId, period);
  assertNoBlockingErrors(preview.errors, preview.recordCount);
  const txt = build608.build608Txt(preview);
  const filePath = writeTxtFile(userId, '608', preview.period, txt);
  const report = dgiiRepo.insertReport(
    userId,
    '608',
    preview.period,
    filePath,
    preview.recordCount
  );
  return { preview, report, filePath, filename: path.basename(filePath) };
}

function preview606(userId, period) {
  const p = validatePeriod(period);
  if (!p.ok) throw new DgiiError(p.error, 'INVALID_PERIOD');
  const emitterRnc = getEmitterRnc(userId);
  if (!emitterRnc) {
    throw new DgiiError('Configure el RNC de la empresa en Configuración.', 'MISSING_RNC');
  }
  return build606.build606Preview(userId, p.period, emitterRnc);
}

function export606(userId, period) {
  const preview = preview606(userId, period);
  assertNoBlockingErrors(preview.errors, preview.recordCount);
  const txt = build606.build606Txt(preview);
  const filePath = writeTxtFile(userId, '606', preview.period, txt);
  const report = dgiiRepo.insertReport(
    userId,
    '606',
    preview.period,
    filePath,
    preview.recordCount
  );
  return { preview, report, filePath, filename: path.basename(filePath) };
}

function readReportFile(report) {
  if (!report?.file_path || !fs.existsSync(report.file_path)) {
    throw new DgiiError('Archivo de reporte no encontrado.', 'NOT_FOUND');
  }
  return fs.readFileSync(report.file_path, 'utf8');
}

function syncCancelledFromAnnul(userId, invoiceId, motivo, cancelledAt) {
  const reason = validateAnnulmentReason(motivo || '04');
  const at = cancelledAt || new Date().toISOString().slice(0, 19).replace('T', ' ');
  dgiiRepo.upsertCancelledInvoice(userId, invoiceId, reason.code, at);
}

function backfillCancelledInvoices(userId) {
  const rows = db
    .prepare(
      `SELECT i.id, i.updated_at,
        (SELECT details FROM invoice_audit_log WHERE invoice_id = i.id AND action = 'anulada' ORDER BY id DESC LIMIT 1) AS details
       FROM invoices i
       WHERE i.user_id = ? AND i.estado = 'anulada'`
    )
    .all(userId);
  for (const row of rows) {
    let motivo = '04';
    try {
      const d = row.details ? JSON.parse(row.details) : {};
      if (d.motivo) {
        const r = validateAnnulmentReason(d.motivo);
        if (r.ok) motivo = r.code;
      }
    } catch {
      /* default */
    }
    dgiiRepo.upsertCancelledInvoice(userId, row.id, motivo, row.updated_at);
  }
}

module.exports = {
  DgiiError,
  getEmitterRnc,
  preview607,
  export607,
  preview608,
  export608,
  preview606,
  export606,
  readReportFile,
  syncCancelledFromAnnul,
  backfillCancelledInvoices,
  catalogs: {
    annulmentReasons: DGII_ANNULMENT_REASONS,
    incomeTypes: DGII_INCOME_TYPES,
    purchaseGoodsTypes: DGII_PURCHASE_GOODS_TYPES,
  },
};
