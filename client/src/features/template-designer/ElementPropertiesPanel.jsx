export default function ElementPropertiesPanel({ element, onChange, onDelete }) {
  if (!element) {
    return (
      <aside className="td-props panel">
        <p className="muted">Selecciona un elemento en el lienzo para editar sus propiedades.</p>
      </aside>
    );
  }

  const style = element.style || {};

  const patch = (partial) => {
    onChange({ ...element, ...partial });
  };

  const patchStyle = (partial) => {
    onChange({ ...element, style: { ...style, ...partial } });
  };

  return (
    <aside className="td-props panel">
      <h3>Propiedades</h3>
      <label>
        Posición X
        <input
          type="number"
          value={element.x}
          onChange={(e) => patch({ x: Number(e.target.value) })}
        />
      </label>
      <label>
        Posición Y
        <input
          type="number"
          value={element.y}
          onChange={(e) => patch({ y: Number(e.target.value) })}
        />
      </label>
      <label>
        Ancho
        <input
          type="number"
          value={element.width}
          onChange={(e) => patch({ width: Number(e.target.value) })}
        />
      </label>
      <label>
        Alto
        <input
          type="number"
          value={element.height}
          onChange={(e) => patch({ height: Number(e.target.value) })}
        />
      </label>
      <label>
        Rotación (°)
        <input
          type="number"
          value={element.rotation ?? 0}
          onChange={(e) => patch({ rotation: Number(e.target.value) })}
        />
      </label>
      {!['productTable', 'companyLogo', 'qrCode'].includes(element.type) && (
        <label>
          Contenido / placeholders
          <textarea
            rows={3}
            value={element.content || ''}
            onChange={(e) => patch({ content: e.target.value })}
            placeholder="{{company_name}}"
          />
        </label>
      )}
      {element.type === 'image' && (
        <label>
          Imagen (URL data)
          <textarea
            rows={2}
            value={element.src || ''}
            onChange={(e) => patch({ src: e.target.value })}
          />
        </label>
      )}
      <label>
        Tamaño fuente
        <input
          type="number"
          min={8}
          max={72}
          value={style.fontSize ?? 12}
          onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })}
        />
      </label>
      <label>
        Color
        <input
          type="color"
          value={style.color || '#0f172a'}
          onChange={(e) => patchStyle({ color: e.target.value })}
        />
      </label>
      <label>
        Alineación
        <select
          value={style.textAlign || 'left'}
          onChange={(e) => patchStyle({ textAlign: e.target.value })}
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={style.fontWeight === 'bold'}
          onChange={(e) => patchStyle({ fontWeight: e.target.checked ? 'bold' : 'normal' })}
        />
        Negrita
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={style.fontStyle === 'italic'}
          onChange={(e) => patchStyle({ fontStyle: e.target.checked ? 'italic' : 'normal' })}
        />
        Cursiva
      </label>
      <button type="button" className="btn-ghost btn-sm" onClick={onDelete}>
        Eliminar elemento
      </button>
    </aside>
  );
}
