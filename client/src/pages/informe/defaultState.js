export const DEFAULT_SECTIONS = [
  {
    id: 'gastos_entidad',
    label: 'Gastos por Entidad',
    active: true,
    order: 0,
    config: {
      entidades: [
        { label: 'La Torre', keyword: 'TORE' },
        { label: 'Aprecio', keyword: 'APREZ' },
        { label: 'Primas', keyword: 'PRICESMART' },
      ],
    },
  },
  {
    id: 'productos_estrella',
    label: 'Productos Estrella',
    active: true,
    order: 1,
    config: {
      productos: [
        { label: 'Chuleta', keyword: 'CHULETA' },
        { label: 'Costilla', keyword: 'COSTILLA' },
        { label: 'Alitas', keyword: 'ALITA' },
      ],
    },
  },
  {
    id: 'ratio_gasto',
    label: 'Gasto Inventario / Ventas',
    active: true,
    order: 2,
    config: {},
  },
  {
    id: 'globalizado',
    label: 'Total Globalizado',
    active: true,
    order: 3,
    config: {},
  },
  {
    id: 'categoria_compra',
    label: 'Total Pollo Comprado',
    active: true,
    order: 4,
    config: {
      label: 'Total Pollo Comprado',
      entidades: [
        { label: 'Pollo Más', keyword: 'POLLO MAS' },
        { label: 'Aprecio', keyword: 'APREZ' },
        { label: 'Primas', keyword: 'PRIM' },
      ],
    },
  },
];

export const INITIAL_COLUMN_MAP = {
  gastos: { proveedor: null, monto: null, categoria: null },
  ventas: { producto: null, cantidad: null, total: null },
};

export function createInitialState() {
  return {
    filePath: null,
    fileName: null,
    sheets: [],
    gastosSheet: null,
    ventasSheet: null,
    columnMap: { ...INITIAL_COLUMN_MAP, gastos: { ...INITIAL_COLUMN_MAP.gastos }, ventas: { ...INITIAL_COLUMN_MAP.ventas } },
    sections: DEFAULT_SECTIONS.map((s) => ({
      ...s,
      config: JSON.parse(JSON.stringify(s.config)),
    })),
    previewData: null,
    generating: false,
  };
}
