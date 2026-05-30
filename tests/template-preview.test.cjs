const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const {
  parseTemplatePreviewHtml,
  scopeTemplatePreviewCss,
  buildShadowPreviewMarkup,
} = require('../shared/template-designer/dist/parsePreviewHtml.js');
const {
  renderTemplateDocumentHtml,
  TEMPLATE_PAGE_STYLES,
} = require('../shared/template-designer/dist/renderTemplateHtml.js');
const { buildPlaceholderContext } = require('../shared/template-designer/dist/placeholders.js');
const { createDefaultTemplateDefinition } = require('../shared/template-designer/dist/defaultTemplate.js');

describe('parseTemplatePreviewHtml', () => {
  test('extrae style y body de un documento completo', () => {
    const html = `<!DOCTYPE html><html><head><style>body { color: red; }</style></head><body><div class="td-page">x</div></body></html>`;
    const { css, body } = parseTemplatePreviewHtml(html);
    assert.match(css, /color:\s*red/);
    assert.match(body, /td-page/);
  });

  test('scopeTemplatePreviewCss no deja selectores body ni * globales sueltos', () => {
    const scoped = scopeTemplatePreviewCss(TEMPLATE_PAGE_STYLES);
    assert.ok(!/\bbody\s*\{/.test(scoped), 'no debe quedar selector body global');
    assert.match(scoped, /\.td-preview-root/);
  });

  test('buildShadowPreviewMarkup envuelve el cuerpo', () => {
    const html = renderTemplateDocumentHtml(
      createDefaultTemplateDefinition(),
      buildPlaceholderContext(sampleQuote(), sampleEmisor()),
      'Test'
    );
    const { css, body } = buildShadowPreviewMarkup(html);
    assert.match(body, /class="td-preview-root"/);
    assert.match(css, /\.td-preview-root/);
  });
});

describe('renderTemplateDocumentHtml', () => {
  test('genera HTML con página y estilos', () => {
    const def = createDefaultTemplateDefinition();
    const html = renderTemplateDocumentHtml(
      def,
      buildPlaceholderContext(sampleQuote(), sampleEmisor()),
      'Cotización'
    );
    assert.match(html, /<style>/);
    assert.match(html, /class="td-page"/);
    assert.ok(def.elements.length > 0);
  });
});

function sampleEmisor() {
  return {
    nombre: 'Empresa Test',
    rnc: '123',
    direccion: 'SD',
    telefono: '809',
    email: 'a@test.com',
    logo: '',
  };
}

function sampleQuote() {
  return {
    numero: 'COT-1',
    fecha: '2026-05-28',
    client_nombre: 'Cliente',
    items: [{ descripcion: 'Item', cantidad: 1, precio_unitario: 100, total: 100 }],
    subtotal: 100,
    itbis: 18,
    total: 118,
  };
}
