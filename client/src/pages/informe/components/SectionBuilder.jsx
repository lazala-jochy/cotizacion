import SectionConfig from './SectionConfig';

export default function SectionBuilder({ sections, onChange }) {
  const sorted = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const updateSection = (id, patch) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const moveSection = (id, dir) => {
    const list = [...sorted];
    const idx = list.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    const a = list[idx];
    const b = list[swap];
    onChange(
      sections.map((s) => {
        if (s.id === a.id) return { ...s, order: b.order };
        if (s.id === b.id) return { ...s, order: a.order };
        return s;
      })
    );
  };

  return (
    <section className="panel informe-xl-sections">
      <header className="informe-xl-section-head">
        <h2>Secciones del reporte</h2>
        <p className="muted">Active las secciones que desea incluir y configure cada una.</p>
      </header>

      <div className="informe-xl-section-list">
        {sorted.map((section, index) => (
          <div
            key={section.id}
            className={`informe-xl-section-item${section.active ? ' is-active' : ''}`}
          >
            <div className="informe-xl-section-row">
              <div className="informe-xl-section-order">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={index === 0}
                  onClick={() => moveSection(section.id, -1)}
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={index === sorted.length - 1}
                  onClick={() => moveSection(section.id, 1)}
                  aria-label="Bajar"
                >
                  ↓
                </button>
              </div>

              <label className="informe-xl-toggle">
                <input
                  type="checkbox"
                  checked={section.active}
                  onChange={(e) => updateSection(section.id, { active: e.target.checked })}
                />
                <span className="informe-xl-toggle-ui" />
              </label>

              <div className="informe-xl-section-info">
                <strong>{section.label}</strong>
                <span className="muted">Orden {index + 1} en el Excel</span>
              </div>
            </div>

            {section.active && (
              <SectionConfig
                section={section}
                onChange={(patch) => updateSection(section.id, patch)}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
