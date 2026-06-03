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
    assert.ok(txt.includes('131880681|202503|1'));
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
  });
});
