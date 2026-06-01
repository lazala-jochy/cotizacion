const { periodDateRange } = require('../utils/validatePeriod');
const { validateNcf } = require('../utils/validateNcf');
const { formatAmount, formatDateYmd, buildPipeFile } = require('../utils/generateTxt');

function listPurchasesFor606(userId, period) {
  const db = require('../../db');
  const { start, end } = periodDateRange(period);
  return db
    .prepare(
      `SELECT p.*, s.nombre AS supplier_nombre
       FROM dgii_purchases p
       LEFT JOIN dgii_suppliers s ON s.id = p.supplier_id
       WHERE p.user_id = ?
         AND p.fecha_comprobante >= ?
         AND p.fecha_comprobante <= ?
       ORDER BY p.fecha_comprobante, p.id`
    )
    .all(userId, start, end);
}

function build606Preview(userId, period, emitterRnc) {
  const raw = listPurchasesFor606(userId, period);
  const errors = [];
  const rows = [];

  for (const p of raw) {
    const ncfCheck = validateNcf(p.ncf);
    if (!ncfCheck.ok) {
      errors.push({ purchaseId: p.id, error: ncfCheck.error });
      continue;
    }
    const idValue = p.supplier_rnc || p.supplier_cedula || '';
    if (!idValue) {
      errors.push({ purchaseId: p.id, error: 'Proveedor sin RNC ni cédula.' });
      continue;
    }
    rows.push({
      purchaseId: p.id,
      tipoBienesServicios: p.tipo_bienes_servicios || '02',
      ncf: ncfCheck.normalized,
      ncfModificado: p.ncf_modificado || '',
      tipoIdentificacion: p.tipo_identificacion || '1',
      idValue,
      supplierNombre: p.supplier_nombre || '',
      fechaComprobante: p.fecha_comprobante,
      fechaPago: p.fecha_pago || '',
      montoFacturado: Number(p.monto_facturado) || 0,
      itbisFacturado: Number(p.itbis_facturado) || 0,
      itbisRetenido: Number(p.itbis_retenido) || 0,
      isrRetenido: Number(p.isr_retenido) || 0,
    });
  }

  return {
    period,
    emitterRnc: emitterRnc || '',
    recordCount: rows.length,
    totals: {
      montoFacturado: rows.reduce((s, r) => s + r.montoFacturado, 0),
      itbisFacturado: rows.reduce((s, r) => s + r.itbisFacturado, 0),
    },
    rows,
    errors,
  };
}

function build606DetailRow(row) {
  return [
    row.tipoBienesServicios,
    row.ncf,
    row.ncfModificado,
    row.tipoIdentificacion,
    row.idValue,
    formatDateYmd(row.fechaComprobante),
    formatDateYmd(row.fechaPago),
    formatAmount(row.montoFacturado),
    formatAmount(row.itbisFacturado),
    formatAmount(row.itbisRetenido),
    formatAmount(row.isrRetenido),
    '01',
  ];
}

function build606Txt(preview) {
  const header = [preview.emitterRnc || '', preview.period, String(preview.recordCount)];
  const detailLines = preview.rows.map(build606DetailRow);
  return buildPipeFile({ headerLine: header.join('|'), detailLines });
}

module.exports = {
  listPurchasesFor606,
  build606Preview,
  build606Txt,
};
