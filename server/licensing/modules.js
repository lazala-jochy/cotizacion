/** Catálogo de módulos — sincronizado con license-server/src/modules.js */
const APP_MODULES = [
  { code: 'cotizaciones', name: 'Cotizaciones' },
  { code: 'facturas', name: 'Facturas' },
  { code: 'compras', name: 'Compras' },
  { code: 'dgii', name: '606 / 607' },
  { code: 'reportes', name: 'Reportes' },
  { code: 'informe', name: 'Informe' },
  { code: 'report_builder', name: 'Report Builder' },
  { code: 'plantillas', name: 'Plantillas PDF' },
];

const MODULE_CODES = APP_MODULES.map((m) => m.code);

/** Prefijos de API protegidos por módulo. */
const API_MODULE_PREFIXES = [
  { prefix: '/api/quotes', module: 'cotizaciones' },
  { prefix: '/api/clients', module: 'cotizaciones' },
  { prefix: '/api/invoices', module: 'facturas' },
  { prefix: '/api/fiscal', module: 'facturas' },
  { prefix: '/api/expenses', module: 'compras' },
  { prefix: '/api/finance', module: 'compras' },
  { prefix: '/api/dgii', module: 'dgii' },
  { prefix: '/api/informe', module: 'informe' },
  { prefix: '/api/report-builder', module: 'report_builder' },
  { prefix: '/api/templates', module: 'plantillas' },
];

/** Rutas del cliente React → módulo requerido. */
const CLIENT_ROUTE_MODULES = [
  { prefix: '/cotizaciones', module: 'cotizaciones' },
  { prefix: '/facturas', module: 'facturas' },
  { prefix: '/compras', module: 'compras' },
  { prefix: '/finanzas', module: 'compras' },
  { prefix: '/dgii', module: 'dgii' },
  { prefix: '/reportes', module: 'reportes' },
  { prefix: '/informe', module: 'informe' },
  { prefix: '/report-builder', module: 'report_builder' },
  { prefix: '/plantillas', module: 'plantillas' },
];

function moduleForApiPath(pathname) {
  const hit = API_MODULE_PREFIXES.find((e) => pathname.startsWith(e.prefix));
  return hit?.module || null;
}

function moduleForClientPath(pathname) {
  const hit = CLIENT_ROUTE_MODULES.find((e) => pathname.startsWith(e.prefix));
  return hit?.module || null;
}

module.exports = {
  APP_MODULES,
  MODULE_CODES,
  API_MODULE_PREFIXES,
  CLIENT_ROUTE_MODULES,
  moduleForApiPath,
  moduleForClientPath,
};
