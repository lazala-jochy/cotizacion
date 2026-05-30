/**
 * Extrae CSS y cuerpo de un documento HTML de plantilla.
 * Usado en vista previa (Shadow DOM) y en tests.
 */
export function parseTemplatePreviewHtml(fullHtml: string): { css: string; body: string } {
  if (!fullHtml) return { css: '', body: '' };
  const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return {
    css: styleMatch ? styleMatch[1].trim() : '',
    body: bodyMatch ? bodyMatch[1].trim() : fullHtml,
  };
}

/** Reemplaza selectores globales para uso dentro de un contenedor aislado. */
export function scopeTemplatePreviewCss(css: string): string {
  if (!css) return '';
  const scoped = css
    .replace(/\bbody\s*\{/g, '.td-preview-root {')
    .replace(/^\s*\*\s*\{/m, '.td-preview-root, .td-preview-root * {');
  const shell = `
  .td-preview-root {
    min-height: 200px;
    display: flex;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  }
  .td-preview-root .td-page {
    flex-shrink: 0;
  }
`;
  return `${scoped}\n${shell}`;
}

export function buildShadowPreviewMarkup(fullHtml: string): { css: string; body: string } {
  const { css, body } = parseTemplatePreviewHtml(fullHtml);
  return {
    css: scopeTemplatePreviewCss(css),
    body: `<div class="td-preview-root">${body}</div>`,
  };
}
