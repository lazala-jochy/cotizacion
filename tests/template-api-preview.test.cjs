/**
 * Prueba el endpoint de vista previa (sin Electron).
 * Ejecutar con servidor disponible o en memoria vía supertest si se añade después.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  renderTemplateDocumentHtml,
} = require('../shared/template-designer/dist/renderTemplateHtml.js');
const { buildPlaceholderContext } = require('../shared/template-designer/dist/placeholders.js');
const { createDefaultTemplateDefinition } = require('../shared/template-designer/dist/defaultTemplate.js');
const { parseTemplatePreviewHtml, buildShadowPreviewMarkup } = require('../shared/template-designer/dist/parsePreviewHtml.js');

describe('flujo vista previa PDF (sin DOM)', () => {
  test('HTML de preview no debe inyectarse con selectores globales sin scope', () => {
    const def = createDefaultTemplateDefinition();
    const html = renderTemplateDocumentHtml(
      def,
      buildPlaceholderContext(
        {
          numero: 'X',
          fecha: '2026-01-01',
          client_nombre: 'C',
          items: [],
          subtotal: 0,
          itbis: 0,
          total: 0,
        },
        { nombre: 'E', rnc: '', direccion: '', telefono: '', email: '', logo: '' }
      ),
      'Vista previa'
    );

    const raw = parseTemplatePreviewHtml(html);
    assert.match(raw.css, /\*\s*\{/, 'el CSS crudo incluye selector universal');
    assert.match(raw.css, /\bbody\s*\{/);

    const scoped = buildShadowPreviewMarkup(html);
    assert.ok(!/^\s*\*/m.test(scoped.css), 'CSS para shadow debe estar acotado');
    assert.ok(!/\bbody\s*\{/.test(scoped.css));
  });

  test('documento temporal para Puppeteer/Electron PDF', () => {
    const def = createDefaultTemplateDefinition();
    const html = renderTemplateDocumentHtml(
      def,
      buildPlaceholderContext(
        {
          numero: 'PDF-1',
          fecha: '2026-01-01',
          client_nombre: 'Cliente',
          items: [{ descripcion: 'S', cantidad: 1, precio_unitario: 10, total: 10 }],
          subtotal: 10,
          itbis: 0,
          total: 10,
        },
        { nombre: 'Co', rnc: '', direccion: '', telefono: '', email: '', logo: '' }
      ),
      'PDF'
    );
    const tmp = path.join(os.tmpdir(), `cotizacion-test-${Date.now()}.html`);
    fs.writeFileSync(tmp, html, 'utf8');
    const read = fs.readFileSync(tmp, 'utf8');
    assert.match(read, /<!DOCTYPE html>/);
    fs.unlinkSync(tmp);
  });
});
