const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatFiscalNumber } = require('../server/invoices/fiscalNumber');
const { validateFiscalRangeForIssue, validateClientTaxId } = require('../server/invoices/fiscalValidation');
const { FISCAL_DOCUMENT_TYPES } = require('../server/invoices/fiscalDocumentTypesSeed');

describe('formatFiscalNumber por tipo', () => {
  test('B01 y E35 con 9 dígitos', () => {
    assert.strictEqual(formatFiscalNumber('B01', 126), 'B0100000126');
    assert.strictEqual(formatFiscalNumber('B02', 51), 'B0200000051');
    assert.strictEqual(formatFiscalNumber('E31', 13), 'E3100000013');
    assert.strictEqual(formatFiscalNumber('E35', 301), 'E3500000301');
  });
});

describe('validateClientTaxId', () => {
  test('B01 requiere RNC', () => {
    const r = validateClientTaxId('', { requires_tax_id: true });
    assert.strictEqual(r.ok, false);
    assert.match(r.error, /RNC/i);
  });

  test('B02 no requiere RNC', () => {
    const r = validateClientTaxId('', { requires_tax_id: false });
    assert.strictEqual(r.ok, true);
  });
});

describe('secuencias independientes por tipo', () => {
  test('validación usa last_used_number del rango', () => {
    const seqB01 = {
      estado: 'activo',
      fecha_vencimiento: '2099-12-31',
      ultimo_numero_utilizado: 125,
      numero_inicial: 1,
      numero_final: 99999999,
    };
    const seqB02 = { ...seqB01, ultimo_numero_utilizado: 50 };
    const r1 = validateFiscalRangeForIssue(seqB01);
    const r2 = validateFiscalRangeForIssue(seqB02);
    assert.strictEqual(r1.nextSecuencia, 126);
    assert.strictEqual(r2.nextSecuencia, 51);
    assert.strictEqual(formatFiscalNumber('B01', r1.nextSecuencia), 'B0100000126');
    assert.strictEqual(formatFiscalNumber('B02', r2.nextSecuencia), 'B0200000051');
  });
});

describe('FISCAL_DOCUMENT_TYPES seed data', () => {
  test('incluye tipos tradicionales y electrónicos', () => {
    assert.strictEqual(FISCAL_DOCUMENT_TYPES.length, 11);
    const b01 = FISCAL_DOCUMENT_TYPES.find((t) => t.code === 'B01');
    const e35 = FISCAL_DOCUMENT_TYPES.find((t) => t.code === 'E35');
    assert.strictEqual(b01.requires_tax_id, 1);
    assert.strictEqual(e35.requires_tax_id, 1);
    assert.strictEqual(e35.is_electronic, 1);
  });
});
