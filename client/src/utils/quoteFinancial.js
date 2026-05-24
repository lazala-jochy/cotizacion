export function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

export function computeBalance(total, montoPagado) {
  const t = Number(total) || 0;
  const p = Number(montoPagado) || 0;
  return Math.max(0, Math.round((t - p) * 100) / 100);
}
