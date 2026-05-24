const ESTADO_LABELS = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export function parseQuoteDate(fecha) {
  if (!fecha) return null;
  const d = new Date(`${fecha}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function monthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthLabel(key) {
  const [y, m] = key.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[idx] || m} ${y}`;
}

export function filterQuotesByMonths(quotes, months) {
  if (!months) return quotes;
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setMonth(cutoff.getMonth() - months);
  return quotes.filter((q) => {
    const d = parseQuoteDate(q.fecha);
    return d && d >= cutoff;
  });
}

export function computeKpis(quotes) {
  const count = quotes.length;
  const totalMonto = quotes.reduce((s, q) => s + (Number(q.total) || 0), 0);
  const aceptadas = quotes.filter((q) => q.estado === 'aceptada');
  const aceptadasMonto = aceptadas.reduce((s, q) => s + (Number(q.total) || 0), 0);
  const enviadas = quotes.filter((q) => q.estado === 'enviada' || q.estado === 'aceptada');
  const tasaCierre =
    enviadas.length > 0 ? Math.round((aceptadas.length / enviadas.length) * 100) : 0;

  return {
    count,
    totalMonto,
    promedio: count > 0 ? totalMonto / count : 0,
    aceptadasCount: aceptadas.length,
    aceptadasMonto,
    tasaCierre,
    clientesUnicos: new Set(
      quotes.map((q) => q.client_nombre?.trim() || `id-${q.client_id || q.id}`).filter(Boolean)
    ).size,
  };
}

export function groupByMonth(quotes) {
  const map = new Map();
  for (const q of quotes) {
    const d = parseQuoteDate(q.fecha);
    if (!d) continue;
    const key = monthKey(d);
    const row = map.get(key) || { key, label: formatMonthLabel(key), monto: 0, cantidad: 0 };
    row.monto += Number(q.total) || 0;
    row.cantidad += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function groupByEstado(quotes) {
  const map = new Map();
  for (const q of quotes) {
    const estado = q.estado || 'borrador';
    const row = map.get(estado) || {
      estado,
      label: ESTADO_LABELS[estado] || estado,
      value: 0,
      monto: 0,
    };
    row.value += 1;
    row.monto += Number(q.total) || 0;
    map.set(estado, row);
  }
  const order = ['aceptada', 'enviada', 'borrador', 'rechazada'];
  return [...map.values()].sort(
    (a, b) => order.indexOf(a.estado) - order.indexOf(b.estado) || b.value - a.value
  );
}

export function topClientsByMonto(quotes, limit = 6) {
  const map = new Map();
  for (const q of quotes) {
    const name = q.client_nombre?.trim() || 'Sin nombre';
    const row = map.get(name) || { name, monto: 0, cantidad: 0 };
    row.monto += Number(q.total) || 0;
    row.cantidad += 1;
    map.set(name, row);
  }
  return [...map.values()]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limit)
    .map((r) => ({
      ...r,
      shortName: r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
    }));
}

export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  muted: '#64748b',
  grid: 'rgba(148, 163, 184, 0.12)',
  estado: {
    aceptada: '#22c55e',
    enviada: '#3b82f6',
    borrador: '#94a3b8',
    rechazada: '#ef4444',
  },
};

export function estadoColor(estado) {
  return CHART_COLORS.estado[estado] || CHART_COLORS.muted;
}
