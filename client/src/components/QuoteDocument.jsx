import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import HtmlPreview from './HtmlPreview';

/**
 * Vista previa de cotización con la plantilla predeterminada (sin iframe).
 */
export default function QuoteDocument({ quote }) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [quote]);

  if (loading) {
    return <p className="muted">Generando vista previa…</p>;
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
