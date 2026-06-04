const ITBIS_RATE = 0.18;

function splitAmountWithItbis(total) {
  const t = Number(total) || 0;
  if (t <= 0) return { montoFacturado: 0, itbisFacturado: 0 };
  const montoFacturado = Math.round((t / (1 + ITBIS_RATE)) * 100) / 100;
  const itbisFacturado = Math.round((t - montoFacturado) * 100) / 100;
  return { montoFacturado, itbisFacturado };
}

/** Monto total pagado; base e ITBIS para listados y DGII 606. */
function resolveExpenseAmounts(expense) {
  const total = Number(expense.amount) || 0;
  const stored =
    expense.itbis != null && expense.itbis !== '' && !Number.isNaN(Number(expense.itbis))
      ? Number(expense.itbis)
      : null;
  if (stored != null) {
    return {
      total,
      itbis: Math.round(stored * 100) / 100,
      base: Math.round((total - stored) * 100) / 100,
    };
  }
  const { montoFacturado, itbisFacturado } = splitAmountWithItbis(total);
  return { total, itbis: itbisFacturado, base: montoFacturado };
}

module.exports = { ITBIS_RATE, splitAmountWithItbis, resolveExpenseAmounts };
