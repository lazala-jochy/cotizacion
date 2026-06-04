export function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n || 0);
}

/** Versión corta para tarjetas KPI en pantallas estrechas (tooltip con monto completo). */
export function formatMoneyCompact(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}RD$${(abs / 1_000_000).toLocaleString('es-DO', { maximumFractionDigits: 2 })}M`;
  }
  if (abs >= 100_000) {
    return `${sign}RD$${(abs / 1_000).toLocaleString('es-DO', { maximumFractionDigits: 1 })}k`;
  }
  return formatMoney(v);
}

export function formatPercent(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Number(n).toFixed(1)}%`;
}
