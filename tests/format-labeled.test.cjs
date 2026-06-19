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
    assert.equal(ctx.client_name_raw, 'jose');
    assert.equal(ctx.client_address, 'Dirección: la mata');
    assert.equal(ctx.client_rnc, 'RNC: 666665555');
    assert.equal(ctx.client_phone, 'Teléfono: 8095550000');
    assert.equal(ctx.client_email, 'Correo: j@ejemplo.com');
    assert.equal(ctx.quotation_number, 'Cotización: COT-1');
    assert.equal(ctx.company_name, 'Empresa: Mi Empresa');
    assert.match(ctx.validity_days, /Vigencia: 30 días/);
  });
});

describe('renderTemplateHtml showLabel', () => {
  const { renderTemplateBodyHtml } = require('../shared/template-designer/dist/renderTemplateHtml.js');

  test('showLabel false muestra solo el valor', () => {
    const ctx = buildPlaceholderContext(
      { client_nombre: 'jose', numero: 'COT-1', items: [], subtotal: 0, itbis: 0, total: 0 },
      { nombre: 'Lazala Innovaciones' }
    );
    const html = renderTemplateBodyHtml(
      {
        version: 1,
        pageWidth: 400,
        pageHeight: 200,
        elements: [
          {
            id: 'c1',
            type: 'clientName',
            x: 0,
            y: 0,
            width: 200,
            height: 24,
            showLabel: false,
          },
          {
            id: 'c2',
            type: 'companyName',
            x: 0,
            y: 30,
            width: 200,
            height: 24,
            showLabel: true,
          },
        ],
      },
      ctx
    );
    assert.match(html, />jose</);
    assert.doesNotMatch(html, />Cliente: jose</);
    assert.match(html, />Empresa: Lazala Innovaciones</);
  });

  test('fieldLabel personalizado mantiene el valor', () => {
    const ctx = buildPlaceholderContext(
      { client_nombre: 'jose', numero: 'COT-1', items: [], subtotal: 0, itbis: 0, total: 0 },
      { nombre: 'Mi Empresa' }
    );
    const html = renderTemplateBodyHtml(
      {
        version: 1,
        pageWidth: 400,
        pageHeight: 200,
        elements: [
          {
            id: 'c1',
            type: 'clientName',
            x: 0,
            y: 0,
            width: 200,
            height: 24,
            fieldLabel: 'Comprador',
          },
        ],
      },
      ctx
    );
    assert.match(html, />Comprador: jose</);
    assert.doesNotMatch(html, />Cliente: jose</);
  });
});

describe('renderTemplateHtml firma y sello', () => {
  const { renderTemplateBodyHtml } = require('../shared/template-designer/dist/renderTemplateHtml.js');

  const selloDataUrl = 'data:image/png;base64,iVBORw0KGgo=';

  test('sello usa la posición del elemento en plantilla', () => {
    const ctx = buildPlaceholderContext(
      { numero: 'COT-1', items: [], subtotal: 0, itbis: 0, total: 0 },
      { nombre: 'Empresa', sello: selloDataUrl }
    );
    const html = renderTemplateBodyHtml(
      {
        version: 1,
        pageWidth: 794,
        pageHeight: 1123,
        elements: [
          {
            id: 's1',
            type: 'sello',
            x: 520,
            y: 400,
            width: 100,
            height: 100,
            zIndex: 10,
          },
        ],
      },
      ctx
    );
    assert.match(html, /left:520px/);
    assert.match(html, /top:400px/);
    assert.match(html, /td-el-sello/);
    assert.doesNotMatch(html, /td-emisor-stamps/);
  });

  test('sin firma ni sello en plantilla no muestra imágenes aunque existan en emisor', () => {
    const ctx = buildPlaceholderContext(
      { numero: 'COT-1', items: [], subtotal: 0, itbis: 0, total: 0 },
      {
        nombre: 'Empresa',
        firma: 'data:image/png;base64,firma',
        sello: 'data:image/png;base64,sello',
      }
    );
    const html = renderTemplateBodyHtml(
      {
        version: 1,
        pageWidth: 794,
        pageHeight: 1123,
        layoutLocked: true,
        elements: [
          {
            id: 't1',
            type: 'total',
            x: 40,
            y: 40,
            width: 200,
            height: 24,
          },
        ],
      },
      ctx
    );
    assert.doesNotMatch(html, /td-el-signature/);
    assert.doesNotMatch(html, /td-el-sello/);
    assert.doesNotMatch(html, /td-emisor-stamps/);
    assert.doesNotMatch(html, /alt="Firma"/);
    assert.doesNotMatch(html, /alt="Sello"/);
  });
});

describe('normalizeTemplateDefinition', () => {
  test('agrega forma de pago y ejecutivo si faltan', () => {
    const def = createDefaultTemplateDefinition();
    const stripped = {
      ...def,
      elements: def.elements.filter(
        (e) => !['formaPago', 'ejecutivo', 'companyEmail', 'signature'].includes(e.type)
      ),
    };
    const { augmentTemplateDefinition } = require('../shared/template-designer/dist/augmentTemplateDefinition.js');
    const augmented = augmentTemplateDefinition(stripped);
    assert.ok(augmented.elements.some((e) => e.type === 'formaPago'));
    assert.ok(augmented.elements.some((e) => e.type === 'ejecutivo'));
  });

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

  test('layoutLocked no reinyecta elementos eliminados', () => {
    const def = createDefaultTemplateDefinition();
    const stripped = {
      ...def,
      layoutLocked: true,
      elements: def.elements.filter((e) => e.type !== 'sello' && e.type !== 'customMessage'),
    };
    const normalized = normalizeTemplateDefinition(stripped);
    assert.ok(!normalized.elements.some((e) => e.type === 'sello'));
    assert.ok(!normalized.elements.some((e) => e.type === 'customMessage'));
  });
});
