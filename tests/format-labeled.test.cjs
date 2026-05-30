const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatLabeled } = require('../shared/template-designer/dist/formatLabeled.js');
const { buildPlaceholderContext } = require('../shared/template-designer/dist/placeholders.js');
const { normalizeTemplateDefinition } = require('../shared/template-designer/dist/normalizeTemplateDefinition.js');
const { createDefaultTemplateDefinition } = require('../shared/template-designer/dist/defaultTemplate.js');

describe('formatLabeled', () => {
  test('incluye etiqueta y valor', () => {
    assert.equal(formatLabeled('RNC', '666665555'), 'RNC: 666665555');
    assert.equal(formatLabeled('Dirección', 'la mata'), 'Dirección: la mata');
  });

  test('vacío si no hay valor', () => {
    assert.equal(formatLabeled('RNC', ''), '');
    assert.equal(formatLabeled('Dirección', null), '');
  });
});

describe('buildPlaceholderContext', () => {
  test('todos los campos del cliente con etiqueta', () => {
    const ctx = buildPlaceholderContext(
      {
        client_nombre: 'jose',
        client_direccion: 'la mata',
        client_rnc: '666665555',
        client_telefono: '8095550000',
        client_email: 'j@ejemplo.com',
        numero: 'COT-1',
        items: [],
        subtotal: 100,
        itbis: 18,
        total: 118,
        validez_dias: 30,
      },
      { nombre: 'Mi Empresa', rnc: '123' }
    );
    assert.equal(ctx.client_name, 'Cliente: jose');
    assert.equal(ctx.client_address, 'Dirección: la mata');
    assert.equal(ctx.client_rnc, 'RNC: 666665555');
    assert.equal(ctx.client_phone, 'Teléfono: 8095550000');
    assert.equal(ctx.client_email, 'Correo: j@ejemplo.com');
    assert.equal(ctx.quotation_number, 'Cotización: COT-1');
    assert.equal(ctx.company_name, 'Empresa: Mi Empresa');
    assert.match(ctx.validity_days, /Vigencia: 30 días/);
  });
});

describe('normalizeTemplateDefinition', () => {
  test('elimina etiqueta Cliente: suelta y usa catálogo para nombre', () => {
    const def = createDefaultTemplateDefinition();
    def.elements.push({
      id: 'x',
      type: 'freeText',
      x: 0,
      y: 0,
      width: 80,
      height: 20,
      content: 'Cliente:',
    });
    def.elements.push({
      id: 'y',
      type: 'clientName',
      x: 0,
      y: 20,
      width: 200,
      height: 24,
      content: '{{client_name}}',
    });
    const normalized = normalizeTemplateDefinition(def);
    assert.ok(!normalized.elements.some((e) => e.content === 'Cliente:'));
    const nameEl = normalized.elements.find((e) => e.id === 'y');
    assert.ok(nameEl && !nameEl.content);
  });
});
