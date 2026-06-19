const { test, describe } = require('node:test');
const assert = require('node:assert');
const { createDefaultTemplateDefinition } = require('../shared/template-designer/dist/defaultTemplate.js');
const {
  estimateTableHeight,
  countQuoteItems,
  resolveTemplateLayout,
} = require('../shared/template-designer/dist/resolveTemplateLayout.js');
const { renderTemplateBodyHtml } = require('../shared/template-designer/dist/renderTemplateHtml.js');
const { buildPlaceholderContext } = require('../shared/template-designer/dist/placeholders.js');

describe('resolveTemplateLayout', () => {
  test('estimateTableHeight crece con filas', () => {
    assert.ok(estimateTableHeight(2) < estimateTableHeight(10));
    assert.ok(estimateTableHeight(0) > 0);
  });

  test('countQuoteItems ignora filas vacías', () => {
    assert.equal(
      countQuoteItems([
        { descripcion: 'A', cantidad: 1 },
        { descripcion: '', cantidad: 1 },
        { descripcion: 'B', cantidad: 0 },
      ]),
      1
    );
  });

  test('modo fixed con contexto colapsa hueco de descuento vacío', () => {
    const def = createDefaultTemplateDefinition();
    def.closeBlock = { mode: 'fixed' };
    const discount = def.elements.find((e) => e.type === 'discount');
    const tax = def.elements.find((e) => e.type === 'tax');
    const subtotal = def.elements.find((e) => e.type === 'subtotal');
    const ctx = buildPlaceholderContext(
      {
        numero: 'COT-1',
        items: [{ descripcion: 'Item', cantidad: 1, precio_unitario: 100, total: 100 }],
        subtotal: 100,
        itbis: 18,
        descuento: 0,
        total: 118,
      },
      { nombre: 'Empresa' }
    );
    const layout = resolveTemplateLayout(def, 1, { context: ctx });
    assert.equal(layout.get(tax.id).y, tax.y - discount.height);
    assert.equal(layout.get(subtotal.id).y, subtotal.y);
  });

  test('modo followTable acerca totales a tabla con pocos ítems', () => {
    const def = createDefaultTemplateDefinition();
    def.closeBlock = { mode: 'followTable', gapAfterTable: 20 };
    const table = def.elements.find((e) => e.type === 'productTable');
    const total = def.elements.find((e) => e.type === 'total');
    const ctx = buildPlaceholderContext(
      {
        numero: 'COT-1',
        items: [
          { descripcion: 'A', cantidad: 1, precio_unitario: 100, total: 100 },
          { descripcion: 'B', cantidad: 1, precio_unitario: 100, total: 100 },
        ],
        subtotal: 200,
        itbis: 36,
        total: 236,
      },
      { nombre: 'Empresa' }
    );
    const layout = resolveTemplateLayout(def, 2, { context: ctx });
    const startY = table.y + estimateTableHeight(2) + 20;
    const rightCol = def.elements.filter(
      (e) =>
        ['subtotal', 'tax', 'total'].includes(e.type) &&
        Math.round(e.x / 40) * 40 === Math.round(total.x / 40) * 40
    );
    const sorted = rightCol.sort((a, b) => a.y - b.y);
    let y = startY;
    for (const el of sorted) {
      assert.equal(layout.get(el.id).y, y);
      y += el.height + 6;
    }
  });

  test('tabla usa height auto en layout resuelto', () => {
    const def = createDefaultTemplateDefinition();
    const table = def.elements.find((e) => e.type === 'productTable');
    const layout = resolveTemplateLayout(def, 3);
    assert.equal(layout.get(table.id).height, 'auto');
  });
});

describe('renderTemplateBodyHtml layout adaptativo', () => {
  test('followTable reduce hueco con pocos ítems en HTML', () => {
    const def = createDefaultTemplateDefinition();
    def.closeBlock = { mode: 'followTable', gapAfterTable: 20 };
    def.layoutLocked = true;
    const ctx = buildPlaceholderContext(
      {
        numero: 'COT-1',
        items: [
          { descripcion: 'Sillas', cantidad: 10, precio_unitario: 100, total: 1000 },
          { descripcion: 'Mesas', cantidad: 1, precio_unitario: 100, total: 100 },
        ],
        subtotal: 1100,
        itbis: 198,
        total: 1298,
      },
      { nombre: 'Empresa Test' }
    );
    const html = renderTemplateBodyHtml(def, ctx, { itemCount: 2 });
    assert.match(html, /height:auto/);
    assert.match(html, /data-type="total"/);
    const total = def.elements.find((e) => e.type === 'total');
    const layout = resolveTemplateLayout(def, 2, { context: ctx });
    assert.match(html, new RegExp(`top:${layout.get(total.id).y}px`));
  });

  test('descuento vacío no aparece en HTML', () => {
    const def = createDefaultTemplateDefinition();
    def.layoutLocked = true;
    def.closeBlock = { mode: 'fixed' };
    const ctx = buildPlaceholderContext(
      {
        numero: 'COT-1',
        items: [{ descripcion: 'Item', cantidad: 1, precio_unitario: 100, total: 100 }],
        subtotal: 100,
        itbis: 18,
        descuento: 0,
        total: 118,
      },
      { nombre: 'Empresa' }
    );
    const html = renderTemplateBodyHtml(def, ctx, { itemCount: 1 });
    assert.doesNotMatch(html, /data-type="discount"/);
    assert.doesNotMatch(html, /Descuento:/);
  });

  test('sin closeBlock mantiene posición del total si todos los campos tienen dato', () => {
    const def = createDefaultTemplateDefinition();
    delete def.closeBlock;
    def.layoutLocked = true;
    const ctx = buildPlaceholderContext(
      {
        numero: 'COT-1',
        items: [{ descripcion: 'Item', cantidad: 1, precio_unitario: 100, total: 100 }],
        subtotal: 100,
        itbis: 18,
        total: 118,
      },
      { nombre: 'Empresa' }
    );
    const html = renderTemplateBodyHtml(def, ctx, { itemCount: 1 });
    const total = def.elements.find((e) => e.type === 'total');
    const layout = resolveTemplateLayout(def, 1, { context: ctx });
    assert.equal(layout.get(total.id).y, total.y);
    assert.match(html, new RegExp(`top:${total.y}px`));
  });
});
