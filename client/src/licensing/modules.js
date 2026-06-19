/** Sincronizado con server/licensing/modules.js */
export const APP_MODULES = [
  { code: 'cotizaciones', name: 'Cotizaciones' },
  { code: 'facturas', name: 'Facturas' },
  { code: 'compras', name: 'Compras' },
  { code: 'dgii', name: '606 / 607' },
  { code: 'reportes', name: 'Reportes' },
  { code: 'report_builder', name: 'Report Builder' },
  { code: 'plantillas', name: 'Plantillas PDF' },
];

const CLIENT_ROUTE_MODULES = [
  { prefix: '/cotizaciones', module: 'cotizaciones' },
  { prefix: '/facturas', module: 'facturas' },
  { prefix: '/compras', module: 'compras' },
  { prefix: '/finanzas', module: 'compras' },
  { prefix: '/dgii', module: 'dgii' },
  { prefix: '/reportes', module: 'reportes' },
  { prefix: '/report-builder', module: 'report_builder' },
  { prefix: '/plantillas', module: 'plantillas' },
];

export function moduleForClientPath(pathname) {
  const hit = CLIENT_ROUTE_MODULES.find((e) => pathname.startsWith(e.prefix));
  return hit?.module || null;
}

export const NAV_ITEMS = [
  { to: '/', end: true, label: 'Inicio', shortLabel: '⌂', module: null },
  { to: '/cotizaciones/nueva', end: true, label: 'Nueva cotización', shortLabel: '+', module: 'cotizaciones' },
  { to: '/cotizaciones', end: true, label: 'Cotizaciones', shortLabel: 'C', module: 'cotizaciones' },
  { to: '/facturas', end: true, label: 'Facturas', shortLabel: 'F', module: 'facturas' },
  { to: '/reportes', end: false, label: 'Reportes', shortLabel: 'R', module: 'reportes' },
  { to: '/report-builder', end: true, label: 'Report Builder', shortLabel: 'RB', module: 'report_builder' },
  { to: '/dgii', end: false, label: '606/607', shortLabel: 'DG', module: 'dgii' },
  { to: '/compras/gastos', end: false, label: 'Compras', shortLabel: '$', module: 'compras' },
  { to: '/plantillas', end: false, label: 'Plantillas', shortLabel: 'P', module: 'plantillas' },
  { to: '/configuracion', end: false, label: 'Empresa', shortLabel: '⚙', module: null },
];
