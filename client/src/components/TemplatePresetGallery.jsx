import { TEMPLATE_PRESETS } from '@template-designer/presetTemplates';
import LoadingOverlay from './LoadingOverlay';

function TemplatePresetPreview({ variant }) {
  return (
    <div className={`template-preset-preview template-preset-preview--${variant}`} aria-hidden="true">
      <div className="template-preset-sheet">
        <div className="tp-block tp-header" />
        <div className="tp-block tp-logo" />
        <div className="tp-block tp-meta" />
        <div className="tp-block tp-client" />
        <div className="tp-block tp-table" />
        <div className="tp-block tp-totals" />
      </div>
      <span className="template-preset-preview-label">Vista PDF</span>
    </div>
  );
}

export default function TemplatePresetGallery({ busyId, onSelect }) {
  return (
    <LoadingOverlay show={Boolean(busyId)} message="Creando plantilla…">
    <section className="template-preset-section">
      <div className="template-preset-section-head">
        <h2>Plantillas PDF listas para usar</h2>
        <p className="muted">
          Elige un diseño de partida. Luego podrás mover campos, cambiar textos y guardar tu propia
          versión. El PDF de cotizaciones y facturas usa la plantilla marcada como predeterminada.
        </p>
      </div>

      <div className="template-preset-grid">
        {TEMPLATE_PRESETS.map((preset) => (
          <article key={preset.id} className="template-preset-card">
            <TemplatePresetPreview variant={preset.previewVariant} />
            <div className="template-preset-card-body">
              <h3>{preset.name}</h3>
              <p className="template-preset-preview-hint">{preset.previewLabel}</p>
              <p className="muted template-preset-desc">{preset.description}</p>
              <div className="template-preset-tags">
                {preset.tags.map((tag) => (
                  <span key={tag} className="template-preset-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="btn-primary btn-sm template-preset-use-btn"
                disabled={busyId === preset.id}
                onClick={() => onSelect(preset)}
              >
                Usar esta plantilla
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
    </LoadingOverlay>
  );
}
