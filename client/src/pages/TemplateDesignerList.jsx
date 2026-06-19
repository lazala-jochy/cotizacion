import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { createDefaultTemplateDefinition } from '@template-designer/defaultTemplate';
import TemplatePresetGallery from '../components/TemplatePresetGallery';
import ConfirmModal from '../components/ConfirmModal';
import { SectionLoader } from '../components/loading';

export default function TemplateDesignerList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingPresetId, setCreatingPresetId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    setLoading(true);
    api.templates
      .list()
      .then(setTemplates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createTemplate = async ({ name, definition, isDefault }) => {
    const created = await api.templates.create({
      name,
      definition,
      isDefault,
    });
    navigate(`/plantillas/${created.id}`);
  };

  const handleCreateBlank = async () => {
    setError('');
    try {
      await createTemplate({
        name: `Plantilla ${templates.length + 1}`,
        definition: createDefaultTemplateDefinition(),
        isDefault: templates.length === 0,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateFromPreset = async (preset) => {
    setError('');
    setCreatingPresetId(preset.id);
    try {
      const sameName = templates.some(
        (t) => t.name.toLowerCase() === preset.name.toLowerCase()
      );
      const name = sameName ? `${preset.name} (${templates.length + 1})` : preset.name;
      await createTemplate({
        name,
        definition: structuredClone(preset.definition),
        isDefault: templates.length === 0,
      });
    } catch (e) {
      setError(e.message);
      setCreatingPresetId(null);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const copy = await api.templates.duplicate(id);
      navigate(`/plantillas/${copy.id}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    try {
      await api.templates.setDefault(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const openDeleteConfirm = (template) => {
    setDeleteError('');
    setDeleteTarget(template);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await api.templates.remove(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page template-designer-list-page">
      <header className="page-header">
        <div>
          <h1>Diseñador de plantillas PDF</h1>
          <p>
            Diseña cómo se ven tus cotizaciones y facturas al exportar o enviar por correo. Empieza
            con una plantilla lista o crea una en blanco.
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={handleCreateBlank}>
          + Plantilla en blanco
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        title="Eliminar plantilla"
        subtitle={deleteTarget?.name}
        titleId="delete-template-title"
        confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar plantilla'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        busy={deleteBusy}
        error={deleteError}
        confirmVariant="danger"
      >
        <p className="app-modal-message">
          Esta acción no se puede deshacer. Se borrará el diseño PDF guardado con el nombre{' '}
          <strong>{deleteTarget?.name}</strong>.
        </p>
        {deleteTarget?.is_default && (
          <p className="app-modal-hint muted">
            Es la plantilla <strong>predeterminada</strong>. Tras eliminarla, otra plantilla pasará a
            ser la predeterminada automáticamente.
          </p>
        )}
      </ConfirmModal>

      <TemplatePresetGallery busyId={creatingPresetId} onSelect={handleCreateFromPreset} />

      <section className="panel template-my-section">
        <div className="template-preset-section-head">
          <h2>Mis plantillas guardadas</h2>
          <p className="muted">
            Las plantillas que ya creaste o duplicaste. La marcada como predeterminada es la que usa
            el PDF al descargar o enviar documentos.
          </p>
        </div>

        {loading ?
          <SectionLoader message="Cargando plantillas…" />
        : templates.length === 0 ?
          <div className="quotes-empty">
            <p className="muted">
              Aún no tienes plantillas guardadas. Arriba elige una plantilla PDF lista para usar.
            </p>
          </div>
        : <ul className="template-list">
            {templates.map((t) => (
              <li key={t.id} className="template-list-item">
                <div>
                  <Link to={`/plantillas/${t.id}`} className="template-list-name">
                    {t.name}
                  </Link>
                  {t.is_default && <span className="badge badge-enviada">Predeterminada</span>}
                </div>
                <div className="template-list-actions">
                  {!t.is_default && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => handleSetDefault(t.id)}
                    >
                      Usar por defecto
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => handleDuplicate(t.id)}
                  >
                    Duplicar
                  </button>
                  <Link to={`/plantillas/${t.id}`} className="btn-primary btn-sm">
                    Editar
                  </Link>
                  {templates.length > 1 && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm danger"
                      onClick={() => openDeleteConfirm(t)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        }
      </section>
    </div>
  );
}
