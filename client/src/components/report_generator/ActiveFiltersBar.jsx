export default function ActiveFiltersBar({ selections, schema, onClear }) {
  const dims = schema?.dimensions || {};
  const chips = [];

  (selections.products || []).forEach((v) =>
    chips.push({ key: `p-${v}`, label: v, group: dims.product?.label || 'Producto' })
  );
  (selections.providers || []).forEach((v) =>
    chips.push({ key: `e-${v}`, label: v, group: dims.entity?.label || 'Proveedor' })
  );
  (selections.categories || []).forEach((v) =>
    chips.push({ key: `c-${v}`, label: v, group: dims.category?.label || 'Categoría' })
  );
  if (selections.dateFrom && selections.dateTo) {
    chips.push({
      key: 'date',
      label: `${selections.dateFrom} → ${selections.dateTo}`,
      group: dims.date?.label || 'Fechas',
    });
  }

  if (!chips.length) {
    return (
      <div className="report-studio-active-filters is-empty">
        <span className="muted">Sin filtros activos — se incluyen todos los registros</span>
      </div>
    );
  }

  return (
    <div className="report-studio-active-filters">
      <span className="report-studio-active-label">Filtros activos</span>
      <div className="report-studio-active-chips">
        {chips.map((c) => (
          <span key={c.key} className="report-studio-active-chip" title={c.group}>
            <small>{c.group}</small>
            {c.label}
          </span>
        ))}
      </div>
      {onClear && (
        <button type="button" className="btn-ghost btn-sm" onClick={onClear}>
          Limpiar todo
        </button>
      )}
    </div>
  );
}
