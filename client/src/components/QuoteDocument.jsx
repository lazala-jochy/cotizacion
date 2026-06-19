import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import HtmlPreview from './HtmlPreview';
import { SectionLoader } from './loading';
import { TEMPLATES_UPDATED_EVENT } from '../utils/templatesEvents';

/**
 * Vista previa de cotización con la plantilla predeterminada (sin iframe).
 */
export default function QuoteDocument({ quote }) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templateRevision, setTemplateRevision] = useState(0);

  useEffect(() => {
    const onTemplatesUpdated = () => setTemplateRevision((n) => n + 1);
    window.addEventListener(TEMPLATES_UPDATED_EVENT, onTemplatesUpdated);
    return () => window.removeEventListener(TEMPLATES_UPDATED_EVENT, onTemplatesUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const template = await api.templates.getDefault();
        const { html } = await api.templates.preview(template.id, { quote });
        if (!cancelled) setPreviewHtml(html);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quote, templateRevision]);

  if (loading) {
    return <SectionLoader message="Generando vista previa…" />;
  }

  if (error) {
    return (
      <div className="alert alert-warn">
        No se pudo cargar la vista previa: {error}. Configura una plantilla en{' '}
        <Link to="/plantillas">Diseñador de plantillas</Link>.
      </div>
    );
  }

  return (
    <div className="quote-document-preview-wrap">
      <HtmlPreview html={previewHtml} minHeight={640} />
    </div>
  );
}
