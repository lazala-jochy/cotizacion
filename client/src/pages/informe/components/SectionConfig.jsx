function ChipEditor({ items, onChange, addLabel, fields }) {
  const updateItem = (index, patch) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const blank = {};
    fields.forEach((f) => {
      blank[f.key] = '';
    });
    onChange([...items, blank]);
  };

  return (
    <div className="informe-xl-chip-editor">
      {items.map((item, index) => (
        <div key={index} className="informe-xl-chip-row">
          {fields.map((f) => (
            <label key={f.key} className="informe-xl-chip-field">
              <span>{f.label}</span>
              <input
                type="text"
                value={item[f.key] || ''}
                placeholder={f.placeholder}
                onChange={(e) => updateItem(index, { [f.key]: e.target.value })}
              />
            </label>
          ))}
          <button
            type="button"
            className="btn-ghost btn-sm informe-xl-chip-remove"
            onClick={() => removeItem(index)}
            aria-label="Eliminar"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn-ghost btn-sm informe-xl-chip-add" onClick={addItem}>
        + {addLabel}
      </button>
    </div>
  );
}

export default function SectionConfig({ section, onChange }) {
  if (!section.active) return null;

  if (section.id === 'gastos_entidad') {
    return (
      <div className="informe-xl-section-config">
        <p className="muted">Agrupa gastos por palabra clave en el campo proveedor.</p>
        <ChipEditor
          items={section.config?.entidades || []}
          onChange={(entidades) => onChange({ config: { ...section.config, entidades } })}
          addLabel="Agregar entidad"
          fields={[
            { key: 'label', label: 'Nombre', placeholder: 'La Torre' },
            { key: 'keyword', label: 'Keyword', placeholder: 'TORE' },
          ]}
        />
      </div>
    );
  }

  if (section.id === 'productos_estrella') {
    return (
      <div className="informe-xl-section-config">
        <p className="muted">Filtra ventas por palabra clave en el campo producto.</p>
        <ChipEditor
          items={section.config?.productos || []}
          onChange={(productos) => onChange({ config: { ...section.config, productos } })}
          addLabel="Agregar producto"
          fields={[
            { key: 'label', label: 'Nombre', placeholder: 'Chuleta' },
            { key: 'keyword', label: 'Keyword', placeholder: 'CHULETA' },
          ]}
        />
      </div>
    );
  }

  if (section.id === 'categoria_compra') {
    return (
      <div className="informe-xl-section-config">
        <label className="field">
          Título de la sección en el Excel
          <input
            type="text"
            value={section.config?.label || section.label}
            onChange={(e) =>
              onChange({ config: { ...section.config, label: e.target.value } })
            }
          />
        </label>
        <p className="muted">Proveedores que suman a esta categoría de compra.</p>
        <ChipEditor
          items={section.config?.entidades || []}
          onChange={(entidades) => onChange({ config: { ...section.config, entidades } })}
          addLabel="Agregar proveedor"
          fields={[
            { key: 'label', label: 'Nombre', placeholder: 'Pollo Más' },
            { key: 'keyword', label: 'Keyword', placeholder: 'POLLO' },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="informe-xl-section-config informe-xl-section-config-auto">
      <p className="muted">Esta sección se calcula automáticamente con los totales del archivo.</p>
    </div>
  );
}
