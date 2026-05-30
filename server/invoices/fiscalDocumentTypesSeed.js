/** Catálogo de tipos de comprobante (NCF / e-CF). Extensible vía base de datos. */
const FISCAL_DOCUMENT_TYPES = [
  {
    code: 'B01',
    name: 'Factura de Crédito Fiscal',
    description: 'Comprobante tradicional para contribuyentes con crédito fiscal.',
    requires_tax_id: 1,
    is_electronic: 0,
  },
  {
    code: 'B02',
    name: 'Factura de Consumo',
    description: 'Comprobante tradicional para consumidores finales.',
    requires_tax_id: 0,
    is_electronic: 0,
  },
  {
    code: 'B14',
    name: 'Nota de Débito',
    description: 'Comprobante tradicional de nota de débito.',
    requires_tax_id: 0,
    is_electronic: 0,
  },
  {
    code: 'B15',
    name: 'Nota de Crédito',
    description: 'Comprobante tradicional de nota de crédito.',
    requires_tax_id: 0,
    is_electronic: 0,
  },
  {
    code: 'E31',
    name: 'Factura de Crédito Fiscal Electrónica',
    description: 'Comprobante electrónico con crédito fiscal.',
    requires_tax_id: 1,
    is_electronic: 1,
  },
  {
    code: 'E32',
    name: 'Factura de Consumo Electrónica',
    description: 'Comprobante electrónico para consumo.',
    requires_tax_id: 0,
    is_electronic: 1,
  },
  {
    code: 'E33',
    name: 'Nota de Débito Electrónica',
    description: 'Nota de débito electrónica.',
    requires_tax_id: 0,
    is_electronic: 1,
  },
  {
    code: 'E34',
    name: 'Nota de Crédito Electrónica',
    description: 'Nota de crédito electrónica.',
    requires_tax_id: 0,
    is_electronic: 1,
  },
  {
    code: 'E35',
    name: 'Comprobante de Compras Electrónico',
    description: 'Comprobante electrónico de compras.',
    requires_tax_id: 1,
    is_electronic: 1,
  },
  {
    code: 'E36',
    name: 'Comprobante para Gastos Menores Electrónico',
    description: 'Comprobante electrónico para gastos menores.',
    requires_tax_id: 0,
    is_electronic: 1,
  },
  {
    code: 'E37',
    name: 'Comprobante para Regímenes Especiales Electrónico',
    description: 'Comprobante electrónico para regímenes especiales.',
    requires_tax_id: 1,
    is_electronic: 1,
  },
];

function seedFiscalDocumentTypes(db) {
  const insert = db.prepare(
    `INSERT INTO fiscal_document_types (code, name, description, requires_tax_id, is_electronic, is_active, updated_at)
     VALUES (@code, @name, @description, @requires_tax_id, @is_electronic, 1, datetime('now'))
     ON CONFLICT(code) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       requires_tax_id = excluded.requires_tax_id,
       is_electronic = excluded.is_electronic,
       updated_at = datetime('now')`
  );
  for (const row of FISCAL_DOCUMENT_TYPES) {
    insert.run(row);
  }
}

function resolveDocumentTypeId(db, serieOrCode) {
  const code = String(serieOrCode || '')
    .trim()
    .toUpperCase();
  if (!code) return null;
  const row = db.prepare('SELECT id FROM fiscal_document_types WHERE code = ?').get(code);
  return row?.id ?? null;
}

module.exports = {
  FISCAL_DOCUMENT_TYPES,
  seedFiscalDocumentTypes,
  resolveDocumentTypeId,
};
