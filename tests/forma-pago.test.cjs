const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseFormaPago,
  buildFormaPago,
  FORMA_PAGO_CREDIT_VALUE,
} = require('../client/src/utils/formaPago');

describe('formaPago', () => {
  it('parsea crédito con días', () => {
    const p = parseFormaPago('Crédito 45 días');
    assert.equal(p.kind, FORMA_PAGO_CREDIT_VALUE);
    assert.equal(p.creditDays, 45);
  });

  it('genera texto de crédito', () => {
    assert.equal(
      buildFormaPago({ kind: FORMA_PAGO_CREDIT_VALUE, creditDays: 15 }),
      'Crédito 15 días'
    );
  });

  it('reconoce contra entrega', () => {
    const p = parseFormaPago('Contra entrega');
    assert.equal(p.kind, 'Contra entrega');
    assert.equal(buildFormaPago({ kind: 'Contra entrega' }), 'Contra entrega');
  });
});
