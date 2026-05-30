import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import HtmlPreview from '../components/HtmlPreview';
import DesignerCanvas from '../features/template-designer/DesignerCanvas';
import DesignerSidebar from '../features/template-designer/DesignerSidebar';
import ElementPropertiesPanel from '../features/template-designer/ElementPropertiesPanel';
import { createElement } from '../features/template-designer/utils';

export default function TemplateDesignerEditor() {
  const { id } = useParams();
  const templateId = Number(id);
  const invalidId = !Number.isFinite(templateId);

  const [name, setName] = useState('Nueva plantilla');
  const [isDefault, setIsDefault] = useState(false);
  const [definition, setDefinition] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (invalidId) {
      setError('Plantilla no válida');
      setLoading(false);
      return;
    }
    api.templates
      .get(templateId)
      .then((t) => {
        setName(t.name);
        setIsDefault(t.is_default);
        setDefinition(t.definition);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, invalidId, templateId]);

  const refreshPreview = useCallback(async () => {
    if (!definition || !templateId) return;
    setPreviewLoading(true);
    setError('');
    try {
      const { html } = await api.templates.preview(templateId, { definition });
      setPreviewHtml(html);
      setShowPreview(true);
    } catch (e) {
      setError(e.message || 'No se pudo generar la vista previa');
    } finally {
      setPreviewLoading(false);
    }
  }, [definition, templateId]);

  const updateElement = (elementId, patch) => {
    setDefinition((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === elementId ? { ...el, ...patch } : el
        ),
      };
    });
  };

  const addElement = (type) => {
    const el = createElement(type, 48, 48 + (definition?.elements.length || 0) * 8);
    setDefinition((prev) =>
      prev ? { ...prev, elements: [...prev.elements, el] } : prev
    );
    setSelectedId(el.id);
  };

  const removeElement = () => {
    if (!selectedId) return;
    setDefinition((prev) =>
      prev ? { ...prev, elements: prev.elements.filter((el) => el.id !== selectedId) } : prev
    );
    setSelectedId(null);
  };

  const handleSave = async () => {
    if (!definition) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updated = await api.templates.update(templateId, {
        name,
        definition,
        isDefault,
      });
      setIsDefault(Boolean(updated.is_default));
      setSuccess(
        updated.is_default ?
          'Plantilla guardada y establecida como predeterminada.'
        : 'Plantilla guardada.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultOnly = async () => {
    setError('');
    setSuccess('');
    try {
      const row = await api.templates.setDefault(templateId);
      setIsDefault(Boolean(row.is_default));
      setSuccess('Plantilla establecida como predeterminada.');
    } catch (e) {
      setError(e.message);
    }
  };

  const selected = definition?.elements.find((el) => el.id === selectedId) || null;

  if (loading || !definition) {
    return (
      <div className="page">
        <p className="muted">Cargando diseñador…</p>
      </div>
    );
  }

  return (
    <div className="page td-editor-page">
      <header className="page-header">
        <div>
          <Link to="/plantillas" className="btn-ghost btn-sm">
            ← Plantillas
          </Link>
          <h1>Diseñador visual</h1>
          <label className="td-editor-name">
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Plantilla predeterminada (usar en PDF y correos)
          </label>
        </div>
        <div className="td-editor-header-actions">
          {!isDefault && (
            <button type="button" className="btn-ghost" onClick={handleSetDefaultOnly}>
              Usar por defecto
            </button>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={refreshPreview}
            disabled={previewLoading}
          >
            {previewLoading ? 'Generando…' : 'Vista previa'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="td-editor-layout">
        <DesignerSidebar onAddElement={addElement} />
        <div className="td-editor-main">
          <DesignerCanvas
            definition={definition}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateElement={updateElement}
          />
        </div>
        <ElementPropertiesPanel
          element={selected}
          onChange={(updated) => {
            setDefinition((prev) =>
              prev ?
                {
                  ...prev,
                  elements: prev.elements.map((el) =>
                    el.id === updated.id ? updated : el
                  ),
                }
              : prev
            );
          }}
          onDelete={removeElement}
        />
      </div>

      {showPreview && previewHtml && (
        <section className="panel td-preview-panel">
          <div className="td-preview-panel-head">
            <h2>Vista previa</h2>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setShowPreview(false);
                setPreviewHtml('');
              }}
            >
              Ocultar
            </button>
          </div>
          <HtmlPreview html={previewHtml} minHeight={520} />
        </section>
      )}
    </div>
  );
}
