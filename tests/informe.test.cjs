const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildReport, matchEntityKey, matchStarProduct } = require('../server/informe/parseExcel');

describe('informe', () => {
  it('agrupa gastos por entidad y productos estrella', () => {
    const records = [
      { entity: 'La Torre', product: 'Chuleta', purchase: 1000, sale: 0 },
      { entity: 'Aprecio', product: 'Costilla', purchase: 500, sale: 200 },
      { entity: 'Primas', product: 'Alitas', purchase: 300, sale: 150 },
      { entity: 'Aprecio', product: 'Pollo entero', purchase: 800, sale: 0 },
      { entity: 'Primas', product: 'Pollo pechuga', purchase: 400, sale: 0 },
      { entity: 'Pollo Más', product: 'Pollo Más especial', purchase: 600, sale: 0 },
      { entity: 'La Torre', product: 'Chuleta premium', purchase: 0, sale: 900 },
    ];

    const report = buildReport(records);

    assert.equal(matchEntityKey('La Torre'), 'la_torre');
    assert.equal(matchStarProduct('Costilla de res'), 'costilla');

    const torre = report.byEntity.find((e) => e.key === 'la_torre');
    assert.equal(torre.purchases, 1000);

    const chuleta = report.starProducts.find((p) => p.key === 'chuleta');
    assert.equal(chuleta.purchases, 1000);
    assert.equal(chuleta.sales, 900);

    assert.equal(report.starProductsTotals.purchases, 1800);
    assert.equal(report.starProductsTotals.sales, 1250);
    assert.equal(report.chickenTotal, 1800);
    assert.equal(report.summary.totalPurchases, 3600);
    assert.equal(report.summary.totalSales, 1250);
  });
});
