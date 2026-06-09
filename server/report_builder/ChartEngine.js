const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

function buildChartSpec(result = {}) {
  const { rows = [], chartType, chartKey, chartValue, chartSeries = [], isRanking } = result;
  if (!rows.length || chartType === 'table') {
    return { type: 'table', data: [], series: [] };
  }

  const labels = rows.map((r) => String(r[chartKey] ?? '—'));
  const primary = chartValue || chartSeries[0];
  const data = rows.map((r, i) => ({
    label: labels[i],
    values: chartSeries.map((s) => Number(r[s]) || 0),
    primary: Number(r[primary]) || 0,
  }));

  return {
    type: isRanking ? 'ranking' : chartType,
    chartKey,
    chartValue: primary,
    chartSeries,
    labels,
    data,
    colors: COLORS,
  };
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBarChartSvg(spec, { width = 640, height = 280 } = {}) {
  const data = spec.data || [];
  if (!data.length) return '';

  const maxVal = Math.max(...data.map((d) => d.primary), 1);
  const barW = Math.max(12, Math.floor((width - 80) / data.length) - 8);
  const chartH = height - 60;

  const bars = data
    .map((d, i) => {
      const h = Math.round((d.primary / maxVal) * chartH);
      const x = 50 + i * (barW + 8);
      const y = 20 + chartH - h;
      const color = spec.colors[i % spec.colors.length];
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="3"/>
        <text x="${x + barW / 2}" y="${height - 8}" text-anchor="middle" font-size="9" fill="#444">${escapeXml(d.label.slice(0, 14))}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <text x="10" y="14" font-size="11" fill="#666">Escala relativa</text>
    ${bars}
  </svg>`;
}

function renderPieChartSvg(spec, { width = 320, height = 280 } = {}) {
  const data = spec.data || [];
  if (!data.length) return '';

  const total = data.reduce((s, d) => s + d.primary, 0) || 1;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 30;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const slice = (d.primary / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += slice;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    const color = spec.colors[i % spec.colors.length];
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${slices.join('')}</svg>`;
}

function renderChartSvg(spec) {
  if (!spec || spec.type === 'table' || !spec.data?.length) return '';
  if (spec.type === 'pie') return renderPieChartSvg(spec);
  return renderBarChartSvg(spec);
}

module.exports = { buildChartSpec, renderChartSvg, renderBarChartSvg, renderPieChartSvg };
