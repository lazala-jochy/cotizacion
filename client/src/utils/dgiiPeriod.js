const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** AAAAMM → "Junio 2026" */
export function formatDgiiPeriodLabel(period) {
  const p = String(period || '');
  if (p.length !== 6) return p;
  const month = Number(p.slice(4, 6));
  const year = p.slice(0, 4);
  if (month < 1 || month > 12) return p;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function map606RowToEntry(row) {
  return {
    source: row.source,
    id: row.expenseId || row.purchaseId || row.id,
    expense_id: row.expenseId ?? row.expense_id ?? null,
    purchase_id: row.purchaseId ?? row.purchase_id ?? null,
    supplier_rnc: row.supplier_rnc || row.idValue,
    ncf: row.ncf,
    description: row.description || row.supplierNombre || '',
    category_name:
      row.category_name ||
      row.categoryName ||
      (row.source === 'purchase' ? 'Compra manual' : '—'),
    fecha_comprobante: row.fecha_comprobante || row.fechaComprobante,
    monto_total:
      row.monto_total ??
      row.amountTotal ??
      Number(row.montoFacturado || 0) + Number(row.itbisFacturado || 0),
    monto_base: row.monto_base ?? row.montoFacturado,
    itbis_facturado: row.itbis_facturado ?? row.itbisFacturado,
    canDelete: row.canDelete ?? row.source === 'purchase',
  };
}

/** Normaliza filas de vista previa 606 (entries o rows del API). */
export function normalize606Entries(preview) {
  if (!preview) return [];
  const raw =
    preview.entries?.length > 0
      ? preview.entries
      : preview.rows?.length > 0
        ? preview.rows
        : [];
  return raw.map(map606RowToEntry);
}
