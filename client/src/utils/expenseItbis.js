const ITBIS_RATE = 0.18;

export function splitAmountWithItbis(total) {
  const t = Number(total) || 0;
  if (t <= 0) return { base: 0, itbis: 0 };
  const base = Math.round((t / (1 + ITBIS_RATE)) * 100) / 100;
  const itbis = Math.round((t - base) * 100) / 100;
  return { base, itbis };
}

export function resolveExpenseItbis(expense) {
  const stored =
    expense?.itbis != null && expense.itbis !== '' && !Number.isNaN(Number(expense.itbis))
      ? Number(expense.itbis)
      : null;
  if (stored != null) return stored;
  return splitAmountWithItbis(expense?.amount).itbis;
}

export function formatItbisInput(amount, storedItbis) {
  if (storedItbis != null && storedItbis !== '' && !Number.isNaN(Number(storedItbis))) {
    return String(storedItbis);
  }
  const { itbis } = splitAmountWithItbis(amount);
  return amount ? String(itbis) : '';
}
