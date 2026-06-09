function ColumnSelect({ label, value, headers, onChange, optional }) {
  return (
    <label className="field informe-xl-field">
      {label}
      {optional && <span className="informe-xl-optional">opcional</span>}
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— Seleccionar columna —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SheetSelector({ sheets, gastosSheet, ventasSheet, columnMap, onChange }) {
  const gastosMeta = sheets.find((s) => s.name === gastosSheet);
  const ventasMeta = sheets.find((s) => s.name === ventasSheet);

  const update = (patch) => onChange(patch);

  return (
    <section className="panel informe-xl-sheets">
      <header className="informe-xl-section-head">
        <h2>Hojas y columnas</h2>
        <p className="muted">Indique qué hoja contiene gastos y cuál ventas, luego mapee las columnas.</p>
      </header>

      <div className="informe-xl-sheet-pickers">
        <label className="field">
          Hoja de Gastos
          <select
            value={gastosSheet || ''}
            onChange={(e) => update({ gastosSheet: e.target.value || null })}
          >
            <option value="">— Seleccionar —</option>
            {sheets.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.rowCount} filas)
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Hoja de Ventas
          <select
            value={ventasSheet || ''}
            onChange={(e) => update({ ventasSheet: e.target.value || null })}
          >
            <option value="">— Seleccionar —</option>
            {sheets.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.rowCount} filas)
              </option>
            ))}
          </select>
        </label>
      </div>

      {gastosMeta && (
        <div className="informe-xl-map-card">
          <h3>Columnas — Gastos</h3>
          <p className="muted informe-xl-preview-cols">
            Detectadas: {gastosMeta.headers.slice(0, 6).join(' · ')}
            {gastosMeta.headers.length > 6 ? '…' : ''}
          </p>
          <div className="informe-xl-map-grid">
            <ColumnSelect
              label="Proveedor / Suplidor"
              value={columnMap.gastos?.proveedor}
              headers={gastosMeta.headers}
              onChange={(v) =>
                update({
                  columnMap: {
                    ...columnMap,
                    gastos: { ...columnMap.gastos, proveedor: v },
                  },
                })
              }
            />
            <ColumnSelect
              label="Monto"
              value={columnMap.gastos?.monto}
              headers={gastosMeta.headers}
              onChange={(v) =>
                update({
                  columnMap: {
                    ...columnMap,
                    gastos: { ...columnMap.gastos, monto: v },
                  },
                })
              }
            />
            <ColumnSelect
              label="Categoría"
              value={columnMap.gastos?.categoria}
              headers={gastosMeta.headers}
              optional
              onChange={(v) =>
                update({
                  columnMap: {
                    ...columnMap,
                    gastos: { ...columnMap.gastos, categoria: v },
                  },
                })
              }
            />
          </div>
        </div>
      )}

      {ventasMeta && (
        <div className="informe-xl-map-card">
          <h3>Columnas — Ventas</h3>
          <p className="muted informe-xl-preview-cols">
            Detectadas: {ventasMeta.headers.slice(0, 6).join(' · ')}
            {ventasMeta.headers.length > 6 ? '…' : ''}
          </p>
          <div className="informe-xl-map-grid">
            <ColumnSelect
              label="Producto"
              value={columnMap.ventas?.producto}
              headers={ventasMeta.headers}
              onChange={(v) =>
                update({
                  columnMap: {
                    ...columnMap,
                    ventas: { ...columnMap.ventas, producto: v },
                  },
                })
              }
            />
            <ColumnSelect
              label="Cantidad vendida"
              value={columnMap.ventas?.cantidad}
              headers={ventasMeta.headers}
              onChange={(v) =>
                update({
                  columnMap: {
                    ...columnMap,
                    ventas: { ...columnMap.ventas, cantidad: v },
                  },
                })
              }
            />
            <ColumnSelect
              label="Total / Monto"
              value={columnMap.ventas?.total}
              headers={ventasMeta.headers}
              onChange={(v) =>
                update({
                  columnMap: {
                    ...columnMap,
                    ventas: { ...columnMap.ventas, total: v },
                  },
                })
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
