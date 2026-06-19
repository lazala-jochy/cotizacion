import {
  getDefaultFieldLabel,
  isDataBoundField,
} from '@template-designer/elementFieldLabels';

export default function ElementPropertiesPanel({ element, onChange, onDelete }) {
  if (!element) {
    return (
      <aside className="td-props panel">
        <p className="muted">Selecciona un elemento en el lienzo para editar sus propiedades.</p>
      </aside>
    );
  }

  const style = element.style || {};
  const isDataField = isDataBoundField(element.type);
  const defaultLabel = isDataField ? getDefaultFieldLabel(element.type) : '';

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
      {isDataField && (
        <>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={element.showLabel !== false}
              onChange={(e) => patch({ showLabel: e.target.checked })}
            />
            Mostrar etiqueta en PDF
          </label>
          {element.showLabel !== false && (
            <label>
              Etiqueta (key)
              <input
                type="text"
                value={element.fieldLabel || ''}
                onChange={(e) =>
                  patch({ fieldLabel: e.target.value.trim() || undefined })
                }
                placeholder={defaultLabel || 'Etiqueta por defecto'}
              />
              <span className="muted td-props-hint">
                Dejar vacío usa «{defaultLabel}». El valor siempre viene de los datos de la
                cotización.
              </span>
            </label>
          )}
        </>
      )}
      {element.type === 'customMessage' && (
        <label>
          Texto en esta plantilla (opcional)
          <textarea
            rows={3}
            value={element.content || ''}
            onChange={(e) => patch({ content: e.target.value })}
            placeholder="Vacío = usar mensaje de Empresa → Mensaje para PDF"
          />
          <span className="muted td-props-hint">
            Si dejas esto vacío, se usa el mensaje configurado en{' '}
            <strong>Empresa → Mensaje para PDF</strong>.
          </span>
        </label>
      )}
      {element.type === 'freeText' && (
        <label>
          Contenido / placeholders
          <textarea
            rows={3}
            value={element.content || ''}
            onChange={(e) => patch({ content: e.target.value })}
            placeholder="Texto libre o {{client_name_raw}}"
          />
          <span className="muted td-props-hint">
            En texto libre use <code>{'{{campo}}'}</code> o <code>{'{{campo_raw}}'}</code> para
            datos dinámicos.
          </span>
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
