const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseAmount, groupByKeyword } = require('../electron/informe/utils');
const { buildPreview } = require('../electron/informe/processData');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

describe('informe excel utils', () => {
  it('parsea montos con formato europeo', () => {
    assert.equal(parseAmount('1.234,56'), 1234.56);
    assert.equal(parseAmount(1500), 1500);
  });

  it('agrupa por keyword en proveedor', () => {
    const rows = [
      { Proveedor: 'LA TORRE SA', Monto: '1.000,00' },
      { Proveedor: 'APREZIO', Monto: 500 },
      { Proveedor: 'OTRO', Monto: 100 },
    ];
    const result = groupByKeyword(rows, 'Monto', 'Proveedor', [
      { label: 'La Torre', keyword: 'TORRE' },
      { label: 'Aprecio', keyword: 'APREZ' },
    ]);
    assert.equal(result[0].total, 1000);
    assert.equal(result[1].total, 500);
  });
});

describe('informe excel processData', () => {
  it('genera preview con secciones activas', () => {
    const tmp = path.join(__dirname, '_tmp-informe.xlsx');
    const wb = XLSX.utils.book_new();
    const gastos = [
      ['Proveedor', 'Monto'],
      ['LA TORRE', 1000],
      ['APREZIO', 500],
    ];
    const ventas = [
      ['Producto', 'Cantidad', 'Total'],
      ['CHULETA', 10, 2000],
      ['COSTILLA', 5, 800],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gastos), 'Gastos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ventas), 'Ventas');
    XLSX.writeFile(wb, tmp);

    try {
      const preview = buildPreview(
        tmp,
        {
          gastosSheet: 'Gastos',
          ventasSheet: 'Ventas',
          columnMap: {
            gastos: { proveedor: 'Proveedor', monto: 'Monto' },
            ventas: { producto: 'Producto', cantidad: 'Cantidad', total: 'Total' },
          },
        },
        [
          {
            id: 'gastos_entidad',
            active: true,
            config: { entidades: [{ label: 'Torre', keyword: 'TORRE' }] },
          },
          { id: 'globalizado', active: true, config: {} },
        ]
      );
      assert.equal(preview.totalGastos, 1500);
      assert.equal(preview.totalVentas, 2800);
      assert.equal(preview.sections.gastos_entidad.rows[0].total, 1000);
      assert.equal(preview.sections.globalizado.resultado, 1300);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
