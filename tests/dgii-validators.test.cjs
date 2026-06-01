const { test, describe } = require('node:test');
const assert = require('node:assert');
const { validateRnc } = require('../server/dgii/utils/validateRnc');
const { validateCedula } = require('../server/dgii/utils/validateCedula');
const { validateNcf, validateAnnulmentReason } = require('../server/dgii/utils/validateNcf');
const { validatePeriod } = require('../server/dgii/utils/validatePeriod');
const { buildPipeFile } = require('../server/dgii/utils/generateTxt');

describe('validateRnc', () => {
  test('acepta RNC con dígito verificador correcto', () => {
    const r = validateRnc('131880681');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.normalized, '131880681');
  });

  test('rechaza RNC vacío', () => {
    const r = validateRnc('');
    assert.strictEqual(r.ok, false);
  });
});

describe('validateCedula', () => {
  test('acepta cédula válida', () => {
    const r = validateCedula('00113912851');
    assert.strictEqual(r.ok, true);
  });

  test('rechaza longitud incorrecta', () => {
    const r = validateCedula('123');
    assert.strictEqual(r.ok, false);
  });
});

describe('validateNcf', () => {
  test('normaliza NCF con padding', () => {
    const r = validateNcf('B02000126');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.normalized, 'B02000000126');
  });

  test('rechaza formato inválido', () => {
    assert.strictEqual(validateNcf('XYZ').ok, false);
  });
});

describe('validateAnnulmentReason', () => {
  test('acepta código 04', () => {
    assert.strictEqual(validateAnnulmentReason('4').ok, true);
    assert.strictEqual(validateAnnulmentReason('4').code, '04');
  });

  test('rechaza código fuera de rango', () => {
    assert.strictEqual(validateAnnulmentReason('99').ok, false);
  });
});

describe('validatePeriod', () => {
  test('acepta AAAAMM válido', () => {
    const r = validatePeriod('202503');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.period, '202503');
  });

  test('rechaza mes inválido', () => {
    assert.strictEqual(validatePeriod('202513').ok, false);
  });
});

describe('buildPipeFile', () => {
  test('une campos con pipe', () => {
    const txt = buildPipeFile({ headerLine: 'H1|H2', detailLines: [['A', 'B'], ['1', '2']] });
    assert.match(txt, /^H1\|H2/);
    assert.ok(txt.includes('A|B'));
    assert.ok(txt.includes('1|2'));
  });
});
