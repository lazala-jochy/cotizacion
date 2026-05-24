export default function ReportTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  const title = label ?? payload[0]?.payload?.label ?? payload[0]?.payload?.name;

  return (
    <div className="report-tooltip">
      {title && <p className="report-tooltip-label">{title}</p>}
      <ul>
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name}>
            <span
              className="report-tooltip-dot"
              style={{ background: entry.color || entry.payload?.fill }}
            />
            <span className="report-tooltip-name">{entry.name}</span>
            <span className="report-tooltip-value">
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
