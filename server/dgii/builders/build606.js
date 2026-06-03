const { periodDateRange } = require('../utils/validatePeriod');
const { validateNcf } = require('../utils/validateNcf');
const { resolveBuyerIdentification } = require('../utils/identifyTaxId');
const { formatAmount, formatDateYmd, buildPipeFile } = require('../utils/generateTxt');

const ITBIS_RATE = 0.18;

function splitAmountWithItbis(total) {
  const t = Number(total) || 0;
  if (t <= 0) return { montoFacturado: 0, itbisFacturado: 0 };
  const montoFacturado = Math.round((t / (1 + ITBIS_RATE)) * 100) / 100;
  const itbisFacturado = Math.round((t - montoFacturado) * 100) / 100;
  return { montoFacturado, itbisFacturado };
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
    SELECT e.id, e.expense_date, e.description, e.amount, e.rnc, e.ncf,
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
  const db = require('../../db');
  const { start, end } = periodDateRange(period);
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM expenses
       WHERE user_id = ?
         AND expense_date >= ? AND expense_date <= ?
         AND (trim(COALESCE(ncf, '')) = '' OR trim(COALESCE(rnc, '')) = '')`
    )
    .get(userId, start, end);
  return row?.n || 0;
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
      supplierNombre: p.supplier_nombre || '',
      fechaComprobante: p.fecha_comprobante,
      fechaPago: p.fecha_pago || '',
      montoFacturado: Number(p.monto_facturado) || 0,
      itbisFacturado: Number(p.itbis_facturado) || 0,
      itbisRetenido: Number(p.itbis_retenido) || 0,
      isrRetenido: Number(p.isr_retenido) || 0,
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
  const { montoFacturado, itbisFacturado } = splitAmountWithItbis(expense.amount);
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
      supplierNombre: expense.description || expense.category_name || '',
      fechaComprobante: expense.expense_date,
      fechaPago: expense.expense_date,
      montoFacturado,
      itbisFacturado,
      itbisRetenido: 0,
      isrRetenido: 0,
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

  return {
    period,
    emitterRnc: emitterRnc || '',
    recordCount: rows.length,
    expenseCount: rows.filter((r) => r.source === 'expense').length,
    purchaseCount: rows.filter((r) => r.source === 'purchase').length,
    pendingExpenses: countExpensesPending606(userId, period),
    totals: {
      montoFacturado: rows.reduce((s, r) => s + r.montoFacturado, 0),
      itbisFacturado: rows.reduce((s, r) => s + r.itbisFacturado, 0),
    },
    rows,
    errors,
  };
}

function list606PeriodEntries(userId, period) {
  const purchases = listPurchasesFor606(userId, period).map((p) => ({
    source: 'purchase',
    id: p.id,
    ncf: p.ncf,
    supplier_nombre: p.supplier_nombre || '',
    supplier_rnc: p.supplier_rnc || p.supplier_cedula || '',
    fecha_comprobante: p.fecha_comprobante,
    monto_facturado: Number(p.monto_facturado) || 0,
    itbis_facturado: Number(p.itbis_facturado) || 0,
    canDelete: true,
  }));

  const expenses = listExpensesFor606(userId, period).map((e) => {
    const { montoFacturado, itbisFacturado } = splitAmountWithItbis(e.amount);
    return {
      source: 'expense',
      id: e.id,
      ncf: e.ncf,
      supplier_nombre: e.description || e.category_name || 'Gasto',
      supplier_rnc: e.rnc,
      fecha_comprobante: e.expense_date,
      monto_facturado: montoFacturado,
      itbis_facturado: itbisFacturado,
      canDelete: false,
    };
  });

  return {
    entries: [...purchases, ...expenses].sort((a, b) =>
      String(a.fecha_comprobante).localeCompare(String(b.fecha_comprobante))
    ),
    pendingExpenses: countExpensesPending606(userId, period),
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
  splitAmountWithItbis,
  listPurchasesFor606,
  listExpensesFor606,
  collect606Rows,
  build606Preview,
  build606Txt,
  list606PeriodEntries,
  purchaseTo606Row,
  expenseTo606Row,
};
