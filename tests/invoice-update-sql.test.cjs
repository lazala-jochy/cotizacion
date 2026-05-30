const { test } = require('node:test');
const assert = require('node:assert');

/** Réplica la lógica de armado UPDATE en invoiceRepository (regresión param order). */
function buildUpdateParts(invoicePatch) {
  const sets = ['fecha_emision = ?', 'monto_pagado = ?', "updated_at = datetime('now')"];
  const params = [invoicePatch.fecha_emision, invoicePatch.monto_pagado];
  const insertAt = sets.length - 1;

  if (invoicePatch.fiscal_number != null) {
    sets.splice(insertAt, 0, 'fiscal_number = ?', 'serie = ?', 'secuencia = ?');
    params.splice(
      insertAt,
      0,
      invoicePatch.fiscal_number,
      invoicePatch.serie,
      invoicePatch.secuencia
    );
  }

  return { sql: sets.join(', '), params };
}

test('UPDATE fiscal alinea columnas con parámetros', () => {
  const { sql, params } = buildUpdateParts({
    fecha_emision: '2026-05-28',
    monto_pagado: 100,
    fiscal_number: 'B02000000127',
    serie: 'B02',
    secuencia: 127,
  });

  assert.match(sql, /fecha_emision = \?/);
  assert.match(sql, /fiscal_number = \?/);
  assert.match(sql, /monto_pagado = \?/);

  assert.strictEqual(params[0], '2026-05-28');
  assert.strictEqual(params[1], 100);
  assert.strictEqual(params[2], 'B02000000127');
  assert.strictEqual(params[3], 'B02');
  assert.strictEqual(params[4], 127);
});
