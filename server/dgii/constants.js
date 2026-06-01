/**
 * Catálogos DGII — Norma General 07-2018 / 05-2019.
 * Referencias oficiales en docs/dgii-formatos.md
 */

/** Motivos de anulación Formato 608 (Instructivo DGII Formato 608). */
const DGII_ANNULMENT_REASONS = [
  { code: '01', label: 'Deterioro de factura preimpresa' },
  { code: '02', label: 'Errores de impresión (factura preimpresa)' },
  { code: '03', label: 'Impresión defectuosa' },
  { code: '04', label: 'Corrección de la información' },
  { code: '05', label: 'Cambio de productos' },
  { code: '06', label: 'Devolución de productos' },
  { code: '07', label: 'Omisión de productos' },
  { code: '08', label: 'Errores en secuencia de NCF' },
  { code: '09', label: 'Por cese de operaciones' },
  { code: '10', label: 'Pérdida o hurto de talonarios' },
];

/** Tipo identificación comprador/proveedor (606/607). */
const DGII_ID_TYPES = {
  RNC: '1',
  CEDULA: '2',
  PASAPORTE: '3',
};

/** Tipo de ingreso ventas (607) — valores comunes; ampliar según instructivo vigente. */
const DGII_INCOME_TYPES = [
  { code: '01', label: 'Ingresos por operaciones (no financieros)' },
  { code: '02', label: 'Ingresos financieros' },
  { code: '03', label: 'Ingresos extraordinarios' },
  { code: '04', label: 'Ingresos por arrendamientos' },
  { code: '05', label: 'Ingresos por venta de activo depreciable' },
  { code: '06', label: 'Otros ingresos' },
];

/** Tipo bien/servicio comprado (606) — subconjunto frecuente. */
const DGII_PURCHASE_GOODS_TYPES = [
  { code: '01', label: 'Gastos de personal' },
  { code: '02', label: 'Trabajos, suministros y servicios' },
  { code: '03', label: 'Arrendamientos' },
  { code: '04', label: 'Gastos de activos fijos' },
  { code: '05', label: 'Gastos de representación' },
  { code: '06', label: 'Otras deducciones admitidas' },
  { code: '07', label: 'Gastos financieros' },
  { code: '08', label: 'Gastos extraordinarios' },
  { code: '09', label: 'Compras que forman parte del costo de venta' },
  { code: '10', label: 'Adquisiciones de activos' },
  { code: '11', label: 'Gastos de seguros' },
];

const MAX_RECORDS_607 = 65000;
const MAX_RECORDS_608 = 4999;

module.exports = {
  DGII_ANNULMENT_REASONS,
  DGII_ID_TYPES,
  DGII_INCOME_TYPES,
  DGII_PURCHASE_GOODS_TYPES,
  MAX_RECORDS_607,
  MAX_RECORDS_608,
};
