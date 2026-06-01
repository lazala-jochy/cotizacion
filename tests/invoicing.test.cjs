const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatFiscalNumber, parseFiscalNumber } = require('../server/invoices/fiscalNumber');
const { validateFiscalRangeForIssue } = require('../server/invoices/fiscalValidation');
const { calcTotals, validateDescuento } = require('../server/invoices/invoiceTotals');

describe('formatFiscalNumber', () => {
  test('concatena código y 8 dígitos', () => {
    assert.strictEqual(formatFiscalNumber('B02', 126), 'B0200000126');
    assert.strictEqual(formatFiscalNumber('b02', 1), 'B0200000001');
  });
});

describe('parseFiscalNumber', () => {
  test('normaliza con serie del rango', () => {
    const p = parseFiscalNumber('b0200000126', 'B02');
    assert.strictEqual(p.fiscal_number, 'B0200000126');
    assert.strictEqual(p.secuencia, 126);
  });
});

describe('validateFiscalRangeForIssue', () => {
  test('rechaza rango agotado', () => {
    const range = {
      estado: 'activo',
      fecha_vencimiento: '2099-12-31',
      ultimo_numero_utilizado: 100,
      numero_inicial: 1,
      numero_final: 100,
    };
    const r = validateFiscalRangeForIssue(range);
    assert.strictEqual(r.ok, false);
    assert.match(r.error, /agotado/i);
  });

  test('acepta siguiente secuencia', () => {
    const range = {
      estado: 'activo',
      fecha_vencimiento: '2099-12-31',
      ultimo_numero_utilizado: 125,
      numero_inicial: 1,
      numero_final: 999999,
    };
    const r = validateFiscalRangeForIssue(range);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.nextSecuencia, 126);
  });
});

describe('validateDescuento', () => {
  test('rechaza descuento mayor al subtotal', () => {
    const r = validateDescuento(1000, 1001);
    assert.strictEqual(r.ok, false);
    assert.match(r.error, /subtotal/i);
  });
});

describe('calcTotals con descuento', () => {
  test('aplica descuento antes del ITBIS', () => {
    const items = [{ cantidad: 1, precio_unitario: 1000 }];
    const t = calcTotals(items, true, false, 18, 100);
    assert.strictEqual(t.subtotal, 1000);
    assert.strictEqual(t.descuento, 100);
    assert.strictEqual(t.itbis, 162);
    assert.strictEqual(t.total, 1062);
  });
});
