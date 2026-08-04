const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('build607Txt', () => {
  test('genera encabezado y detalle pipe-delimited', () => {
    const build607 = require('../server/dgii/builders/build607');
    const preview = {
      emitterRnc: '131880681',
      period: '202503',
      recordCount: 1,
      rows: [
        {
          idValue: '00113912851',
          idType: '2',
          tipoIngreso: '01',
          fiscalNumber: 'B02000000126',
          ncfModificado: '',
          fechaComprobante: '2025-03-15',
          fechaRetencion: '',
          montoFacturado: 1000,
          itbisFacturado: 180,
          itbisRetenido: 0,
          isrRetenido: 0,
        },
      ],
    };
    const txt = build607.build607Txt(preview);
    // Encabezado: CodigoFormato|RNC|Periodo|CantidadRegistros (4 campos, exigidos por el validador DGII).
    assert.ok(txt.includes('607|131880681|202503|1'));
    assert.ok(txt.includes('B02000000126'));
    assert.ok(txt.includes('00113912851'));
  });
});

describe('build608Txt', () => {
  test('incluye NCF y motivo de anulación', () => {
    const build608 = require('../server/dgii/builders/build608');
    const preview = {
      emitterRnc: '131880681',
      period: '202503',
      recordCount: 1,
      rows: [
        {
          fiscalNumber: 'B02000000126',
          cancelReason: '04',
          cancelledAt: '2025-03-20 10:00:00',
        },
      ],
    };
    const txt = build608.build608Txt(preview);
    assert.ok(txt.includes('B02000000126'));
    assert.ok(txt.includes('04'));
  });
});

describe('build606 expense rows', () => {
  test('convierte gasto con RNC y NCF a fila 606', () => {
    const { expenseTo606Row } = require('../server/dgii/builders/build606');
    const seen = new Set();
    const result = expenseTo606Row(
      {
        id: 1,
        ncf: 'B0100000099',
        rnc: '130862346',
        expense_date: '2025-03-10',
        amount: 1180,
        description: 'Materiales',
        category_name: 'Materiales',
      },
      seen
    );
    assert.ok(result.row);
    assert.equal(result.row.ncf, 'B01000000099');
    assert.equal(result.row.source, 'expense');
    assert.equal(result.row.montoFacturado, 1000);
    assert.equal(result.row.itbisFacturado, 180);
  });
});

describe('build606Txt', () => {
  test('genera líneas de compras', () => {
    const build606 = require('../server/dgii/builders/build606');
    const preview = {
      emitterRnc: '131880681',
      period: '202503',
      recordCount: 1,
      rows: [
        {
          tipoBienesServicios: '02',
          ncf: 'B0100000099',
          ncfModificado: '',
          tipoIdentificacion: '1',
          idValue: '130000001',
          fechaComprobante: '2025-03-10',
          fechaPago: '',
          montoFacturado: 5000,
          itbisFacturado: 900,
          itbisRetenido: 0,
          isrRetenido: 0,
        },
      ],
    };
    const txt = build606.build606Txt(preview);
    assert.ok(txt.includes('130000001'));
    assert.ok(txt.includes('B0100000099'));
    assert.ok(txt.includes('606|131880681|202503|1'));
  });

  test('genera detalle con las 23 columnas del instructivo DGII vigente', () => {
    const build606 = require('../server/dgii/builders/build606');
    const preview = {
      emitterRnc: '131880681',
      period: '202503',
      recordCount: 1,
      rows: [
        {
          tipoBienesServicios: '02',
          ncf: 'B0100000099',
          ncfModificado: '',
          tipoIdentificacion: '1',
          idValue: '130000001',
          fechaComprobante: '2025-03-10',
          fechaPago: '2025-03-12',
          montoFacturado: 5000,
          itbisFacturado: 900,
          itbisRetenido: 0,
          isrRetenido: 0,
          formaPago: 'Transferencia',
        },
      ],
    };
    const txt = build606.build606Txt(preview);
    const detailLine = txt.split('\r\n')[1];
    const fields = detailLine.split('|');
    assert.equal(fields.length, 23);
    assert.equal(fields[0], '130000001'); // RNC/Cédula proveedor
    assert.equal(fields[2], '02'); // Tipo Bienes y Servicios
    assert.equal(fields[3], 'B0100000099'); // NCF
    assert.equal(fields[7], '5000.00'); // Monto Facturado en Servicios
    assert.equal(fields[8], '0.00'); // Monto Facturado en Bienes
    assert.equal(fields[9], '5000.00'); // Total Monto Facturado
    assert.equal(fields[10], '900.00'); // ITBIS Facturado
    assert.equal(fields[22], '02'); // Forma de Pago (Transferencia)
  });
});

describe('build606Preview txt', () => {
  test('incluye campo txt igual al export', () => {
    const build606 = require('../server/dgii/builders/build606');
    const preview = {
      emitterRnc: '131880681',
      period: '202503',
      recordCount: 0,
      rows: [],
      errors: [],
    };
    preview.txt = build606.build606Txt(preview);
    assert.ok(preview.txt.startsWith('606|131880681|202503|0'));
  });
});
