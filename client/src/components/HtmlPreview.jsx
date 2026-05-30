import { useEffect, useRef, useState } from 'react';
import { buildShadowPreviewMarkup } from '../utils/templatePreview';

function escapeStyleClose(css) {
  return css.replace(/<\/style/gi, '<\\/style');
}

/**
 * Vista previa HTML aislada con Shadow DOM (compatible con Electron).
 */
export default function HtmlPreview({ html, className = '', minHeight = 480 }) {
  const hostRef = useRef(null);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!html) {
      if (host.shadowRoot) host.shadowRoot.innerHTML = '';
      setRenderError('');
      return;
    }

    try {
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
      const { css, body } = buildShadowPreviewMarkup(html);
      const safeCss = escapeStyleClose(css);
      shadow.innerHTML = `
        <style>${safeCss}</style>
        ${body}
      `;
      setRenderError('');
    } catch (err) {
      setRenderError(err?.message || 'No se pudo renderizar la vista previa');
      if (host.shadowRoot) host.shadowRoot.innerHTML = '';
    }
  }, [html]);

  if (!html) return null;

  return (
    <div className={`html-preview-outer ${className}`.trim()}>
      {renderError && (
        <div className="alert alert-error html-preview-error">{renderError}</div>
      )}
      <div
        ref={hostRef}
        className="html-preview-host"
        style={{ minHeight, width: '100%', display: 'block' }}
      />
    </div>
  );
}
