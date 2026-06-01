const ITBIS_RATE_DEFAULT_PERCENT = 18;

function resolveItbisRate(applyItbis, itbisManual, itbisRate) {
  if (!applyItbis) return 0;
  if (itbisManual) {
    const pct = Number(itbisRate);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return ITBIS_RATE_DEFAULT_PERCENT;
    return pct;
  }
  return ITBIS_RATE_DEFAULT_PERCENT;
}

function validateDescuento(subtotal, descuento) {
  const sub = Number(subtotal) || 0;
  const disc = Number(descuento) || 0;
  if (disc < 0) {
    return { ok: false, error: 'El descuento no puede ser negativo.' };
  }
  if (disc > sub + 0.009) {
    return {
      ok: false,
      error: 'El descuento no puede ser mayor al subtotal.',
    };
  }
  return { ok: true, descuento: disc };
}

function calcTotals(
  items,
  applyItbis = true,
  itbisManual = false,
  itbisRate = ITBIS_RATE_DEFAULT_PERCENT,
  descuento = 0
) {
  const subtotal = items.reduce(
    (s, i) => s + Number(i.cantidad) * Number(i.precio_unitario),
    0
  );
  const disc = Math.max(0, Number(descuento) || 0);
  const base = Math.max(0, subtotal - disc);
  const pct = resolveItbisRate(applyItbis, itbisManual, itbisRate);
  const itbis = applyItbis ? base * (pct / 100) : 0;
  return {
    subtotal,
    descuento: disc,
    itbis,
    total: base + itbis,
    itbis_rate: pct,
    itbis_manual: itbisManual ? 1 : 0,
  };
}

module.exports = {
  calcTotals,
  validateDescuento,
  ITBIS_RATE_DEFAULT_PERCENT,
};
