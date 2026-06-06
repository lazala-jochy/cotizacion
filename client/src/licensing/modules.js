/** Sincronizado con server/licensing/modules.js */
export const APP_MODULES = [
  { code: 'cotizaciones', name: 'Cotizaciones' },
  { code: 'facturas', name: 'Facturas' },
  { code: 'compras', name: 'Compras' },
  { code: 'dgii', name: '606 / 607' },
  { code: 'reportes', name: 'Reportes' },
  { code: 'plantillas', name: 'Plantillas PDF' },
];

const CLIENT_ROUTE_MODULES = [
  { prefix: '/cotizaciones', module: 'cotizaciones' },
  { prefix: '/facturas', module: 'facturas' },
  { prefix: '/compras', module: 'compras' },
  { prefix: '/finanzas', module: 'compras' },
  { prefix: '/dgii', module: 'dgii' },
  { prefix: '/reportes', module: 'reportes' },
  { prefix: '/plantillas', module: 'plantillas' },
];

export function moduleForClientPath(pathname) {
  const hit = CLIENT_ROUTE_MODULES.find((e) => pathname.startsWith(e.prefix));
  return hit?.module || null;
}

export const NAV_ITEMS = [
  { to: '/', end: true, label: 'Inicio', module: null },
  { to: '/cotizaciones/nueva', end: true, label: 'Nueva cotización', module: 'cotizaciones' },
  { to: '/cotizaciones', end: true, label: 'Cotizaciones', module: 'cotizaciones' },
  { to: '/facturas', end: true, label: 'Facturas', module: 'facturas' },
  { to: '/reportes', end: false, label: 'Reportes', module: 'reportes' },
  { to: '/dgii', end: false, label: '606/607', module: 'dgii' },
  { to: '/compras/gastos', end: false, label: 'Compras', module: 'compras' },
  { to: '/plantillas', end: false, label: 'Plantillas', module: 'plantillas' },
  { to: '/configuracion', end: false, label: 'Empresa', module: null },
];
