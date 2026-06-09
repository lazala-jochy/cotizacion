/** Entidades / proveedores donde compra el doctor. */
const ENTITIES = [
  { key: 'la_torre', label: 'La Torre', patterns: [/la\s*torre/i, /\btorre\b/i] },
  { key: 'aprecio', label: 'Aprecio', patterns: [/aprecio/i] },
  { key: 'primas', label: 'Primas', patterns: [/primas/i] },
];

/** Productos estrella. */
const STAR_PRODUCTS = [
  { key: 'chuleta', label: 'Chuleta', patterns: [/chuleta/i] },
  { key: 'costilla', label: 'Costilla', patterns: [/costilla/i] },
  { key: 'alitas', label: 'Alitas', patterns: [/alita/i] },
];

/** Fuentes de pollo comprado. */
const CHICKEN_SOURCES = [
  { key: 'pollo_mas', label: 'Pollo Más', patterns: [/pollo\s*m[aá]s/i] },
  { key: 'aprecio_pollo', label: 'Aprecio', entityPatterns: [/aprecio/i], productPatterns: [/pollo/i] },
  { key: 'primas_pollo', label: 'Primas', entityPatterns: [/primas/i], productPatterns: [/pollo/i] },
];

const ENTITY_HEADERS = ['entidad', 'proveedor', 'suplidor', 'vendor', 'tienda', 'origen', 'fuente'];
const PRODUCT_HEADERS = ['producto', 'descripcion', 'descripción', 'articulo', 'artículo', 'item', 'nombre'];
const PURCHASE_HEADERS = [
  'compra',
  'gasto',
  'costo',
  'entrada',
  'inventario',
  'monto compra',
  'total compra',
  'compras',
];
const SALE_HEADERS = ['venta', 'vendido', 'salida', 'monto venta', 'ingreso', 'total venta', 'ventas'];
const AMOUNT_HEADERS = ['monto', 'total', 'valor', 'importe', 'cantidad', 'precio'];
const TYPE_HEADERS = ['tipo', 'movimiento', 'operacion', 'operación', 'transaccion', 'transacción'];

module.exports = {
  ENTITIES,
  STAR_PRODUCTS,
  CHICKEN_SOURCES,
  ENTITY_HEADERS,
  PRODUCT_HEADERS,
  PURCHASE_HEADERS,
  SALE_HEADERS,
  AMOUNT_HEADERS,
  TYPE_HEADERS,
};
