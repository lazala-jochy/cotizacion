const { periodDateRange } = require('../utils/validatePeriod');
const { validateNcf } = require('../utils/validateNcf');
const { resolveBuyerIdentification } = require('../utils/identifyTaxId');
const { formatAmount, formatDateYmd, buildHeaderLine, buildPipeFile } = require('../utils/generateTxt');
const {
  splitAmountWithItbis,
  resolveExpenseAmounts,
} = require('../../expenses/expenseItbis');

/** Tipos de bien/servicio (columna 3) que representan bienes en vez de servicios. */
const GOODS_TYPE_CODES = new Set(['04', '09', '10']);

function splitServiciosBienes(tipoBienesServicios, montoFacturado) {
  const monto = Number(montoFacturado) || 0;
  if (GOODS_TYPE_CODES.has(tipoBienesServicios)) {
    return { servicios: 0, bienes: monto };
  }
  return { servicios: monto, bienes: 0 };
}

/** Mapea forma de pago libre (gastos/compras) al código 606 (columna 23). */
function mapFormaPagoCode(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'efectivo') return '01';
  if (/nota.*cr[eé]dito/.test(raw)) return '06';
  if (/permuta/.test(raw)) return '05';
  if (/cr[eé]dito/.test(raw)) return '04';
  if (/transfer|cheque|dep[oó]sito/.test(raw)) return '02';
  if (/tarjeta/.test(raw)) return '03';
  if (/mixto/.test(raw)) return '07';
  return '01';
}

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

function listExpensesFor606(userId, period, { requireTaxFields = true } = {}) {
  const db = require('../../db');
  const { start, end } = periodDateRange(period);
  let sql = `
    SELECT e.id, e.expense_date, e.description, e.amount, e.itbis, e.rnc, e.ncf,
      e.payment_method, c.name AS category_name
    FROM expenses e
    JOIN expense_categories c ON c.id = e.category_id
    WHERE e.user_id = ?
      AND e.expense_date >= ?
      AND e.expense_date <= ?`;
  if (requireTaxFields) {
    sql += ` AND trim(COALESCE(e.ncf, '')) != '' AND trim(COALESCE(e.rnc, '')) != ''`;
  }
  sql += ' ORDER BY e.expense_date, e.id';
  return db.prepare(sql).all(userId, start, end);
}

function countExpensesPending606(userId, period) {
  return listExpensesPending606Details(userId, period).length;
}

/** Gastos del período en Compras que aún no tienen RNC o NCF para el 606. */
function listExpensesPending606Details(userId, period) {
  const db = require('../../db');
  const { start, end } = periodDateRange(period);
  return db
    .prepare(
      `SELECT e.id, e.expense_date, e.description, e.amount, e.rnc, e.ncf, c.name AS category_name
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       WHERE e.user_id = ?
         AND e.expense_date >= ? AND e.expense_date <= ?
         AND (trim(COALESCE(e.ncf, '')) = '' OR trim(COALESCE(e.rnc, '')) = '')
       ORDER BY e.expense_date DESC, e.id DESC`
    )
    .all(userId, start, end);
}

function rowToDisplayEntry(row) {
  const montoBase = Number(row.montoFacturado) || 0;
  const itbis = Number(row.itbisFacturado) || 0;
  const montoTotal = Number(row.amountTotal) || montoBase + itbis;
  return {
    source: row.source,
    id: row.expenseId || row.purchaseId,
    expense_id: row.expenseId ?? null,
    purchase_id: row.purchaseId ?? null,
    supplier_rnc: row.idValue,
    ncf: row.ncf,
    description: row.supplierNombre || '',
    category_name:
      row.categoryName || row.category_name || (row.source === 'purchase' ? 'Compra manual' : '—'),
    fecha_comprobante: row.fechaComprobante,
    monto_total: montoTotal,
    monto_base: montoBase,
    itbis_facturado: itbis,
    canDelete: row.source === 'purchase',
  };
}

function purchaseTo606Row(p, seenNcf) {
  const ncfCheck = validateNcf(p.ncf);
  if (!ncfCheck.ok) {
    return { error: { purchaseId: p.id, error: ncfCheck.error } };
  }
  if (seenNcf.has(ncfCheck.normalized)) {
    return {
      error: {
        purchaseId: p.id,
        fiscalNumber: ncfCheck.normalized,
        error: 'NCF duplicado en el período.',
      },
    };
  }
  const idValue = p.supplier_rnc || p.supplier_cedula || '';
  if (!idValue) {
    return { error: { purchaseId: p.id, error: 'Proveedor sin RNC ni cédula.' } };
  }
  seenNcf.add(ncfCheck.normalized);
  return {
    row: {
      source: 'purchase',
      purchaseId: p.id,
      tipoBienesServicios: p.tipo_bienes_servicios || '02',
      ncf: ncfCheck.normalized,
      ncfModificado: p.ncf_modificado || '',
      tipoIdentificacion: p.tipo_identificacion || '1',
      idValue,
      supplierNombre: p.notas || p.supplier_nombre || 'Compra manual',
      categoryName: 'Compra manual',
      amountTotal: Number(p.monto_facturado) + Number(p.itbis_facturado),
      fechaComprobante: p.fecha_comprobante,
      fechaPago: p.fecha_pago || '',
      montoFacturado: Number(p.monto_facturado) || 0,
      itbisFacturado: Number(p.itbis_facturado) || 0,
      itbisRetenido: Number(p.itbis_retenido) || 0,
      isrRetenido: Number(p.isr_retenido) || 0,
      formaPago: p.forma_pago || '',
    },
  };
}

function expenseTo606Row(expense, seenNcf) {
  const ncfCheck = validateNcf(expense.ncf);
  if (!ncfCheck.ok) {
    return { error: { expenseId: expense.id, error: ncfCheck.error } };
  }
  if (seenNcf.has(ncfCheck.normalized)) {
    return {
      error: {
        expenseId: expense.id,
        fiscalNumber: ncfCheck.normalized,
        error: 'NCF duplicado en gastos/compras del período.',
      },
    };
  }
  const idRes = resolveBuyerIdentification(expense.rnc, true);
  if (!idRes.ok) {
    return {
      error: {
        expenseId: expense.id,
        error: idRes.error || 'RNC o cédula del proveedor inválido.',
      },
    };
  }
  const { base: montoFacturado, itbis: itbisFacturado } = resolveExpenseAmounts(expense);
  if (montoFacturado <= 0) {
    return { error: { expenseId: expense.id, error: 'El monto del gasto debe ser mayor que cero.' } };
  }
  seenNcf.add(ncfCheck.normalized);
  return {
    row: {
      source: 'expense',
      expenseId: expense.id,
      tipoBienesServicios: '02',
      ncf: ncfCheck.normalized,
      ncfModificado: '',
      tipoIdentificacion: idRes.idType,
      idValue: idRes.idValue,
      supplierNombre: expense.description || '',
      categoryName: String(expense.category_name || '').trim(),
      category_name: String(expense.category_name || '').trim(),
      amountTotal: Number(expense.amount) || 0,
      fechaComprobante: expense.expense_date,
      fechaPago: expense.expense_date,
      montoFacturado,
      itbisFacturado,
      itbisRetenido: 0,
      isrRetenido: 0,
      formaPago: expense.payment_method || '',
    },
  };
}

function collect606Rows(userId, period) {
  const seenNcf = new Set();
  const errors = [];
  const rows = [];

  for (const p of listPurchasesFor606(userId, period)) {
    const result = purchaseTo606Row(p, seenNcf);
    if (result.error) errors.push(result.error);
    else rows.push(result.row);
  }

  for (const e of listExpensesFor606(userId, period)) {
    const result = expenseTo606Row(e, seenNcf);
    if (result.error) errors.push(result.error);
    else rows.push(result.row);
  }

  return { rows, errors };
}

function build606Preview(userId, period, emitterRnc) {
  const { rows, errors } = collect606Rows(userId, period);
  const pendingExpenseRows = listExpensesPending606Details(userId, period);

  const preview = {
    period,
    emitterRnc: emitterRnc || '',
    recordCount: rows.length,
    expenseCount: rows.filter((r) => r.source === 'expense').length,
    purchaseCount: rows.filter((r) => r.source === 'purchase').length,
    pendingExpenses: pendingExpenseRows.length,
    pendingExpenseRows,
    financeSource: 'expenses',
    totals: {
      montoFacturado: rows.reduce((s, r) => s + r.montoFacturado, 0),
      itbisFacturado: rows.reduce((s, r) => s + r.itbisFacturado, 0),
      montoTotal: rows.reduce(
        (s, r) => s + (Number(r.amountTotal) || r.montoFacturado + r.itbisFacturado),
        0
      ),
    },
    rows,
    entries: rows.map(rowToDisplayEntry),
    errors,
  };
  preview.txt = build606Txt(preview);
  return preview;
}

function list606PeriodEntries(userId, period) {
  const preview = build606Preview(userId, period, '');
  return {
    entries: preview.entries,
    pendingExpenses: preview.pendingExpenses,
    pendingExpenseRows: preview.pendingExpenseRows,
  };
}

/**
 * Línea detalle 606 — 23 campos según el Instructivo vigente DGII
 * (Llenado y Remisión del Formato de Envío de Compras de Bienes y Servicios, 606).
 * Los campos no capturados por la app (proporcionalidad, ITBIS llevado al costo,
 * ISC, otros impuestos, propina legal) se envían en 0.00 según lo permite el formato.
 */
function build606DetailRow(row) {
  const { servicios, bienes } = splitServiciosBienes(row.tipoBienesServicios, row.montoFacturado);
  const totalMontoFacturado = servicios + bienes;
  const itbisLlevadoCosto = 0;
  const itbisPorAdelantar = (Number(row.itbisFacturado) || 0) - itbisLlevadoCosto;
  return [
    row.idValue,
    row.tipoIdentificacion,
    row.tipoBienesServicios,
    row.ncf,
    row.ncfModificado,
    formatDateYmd(row.fechaComprobante),
    formatDateYmd(row.fechaPago),
    formatAmount(servicios),
    formatAmount(bienes),
    formatAmount(totalMontoFacturado),
    formatAmount(row.itbisFacturado),
    formatAmount(row.itbisRetenido),
    formatAmount(0),
    formatAmount(itbisLlevadoCosto),
    formatAmount(itbisPorAdelantar),
    formatAmount(0),
    '',
    formatAmount(row.isrRetenido),
    formatAmount(0),
    formatAmount(0),
    formatAmount(0),
    formatAmount(0),
    mapFormaPagoCode(row.formaPago),
  ];
}

function build606Txt(preview) {
  const headerLine = buildHeaderLine('606', preview.emitterRnc, preview.period, preview.recordCount);
  const detailLines = preview.rows.map(build606DetailRow);
  return buildPipeFile({ headerLine, detailLines });
}

module.exports = {
  splitAmountWithItbis,
  listPurchasesFor606,
  listExpensesFor606,
  collect606Rows,
  build606Preview,
  build606Txt,
  list606PeriodEntries,
  listExpensesPending606Details,
  rowToDisplayEntry,
  purchaseTo606Row,
  expenseTo606Row,
};
