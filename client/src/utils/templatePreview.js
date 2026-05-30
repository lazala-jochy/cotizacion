/**
 * Vista previa HTML (ESM puro para Vite; no importar el dist CommonJS).
 */

export function parseTemplatePreviewHtml(fullHtml) {
  if (!fullHtml) return { css: '', body: '' };
  const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return {
    css: styleMatch ? styleMatch[1].trim() : '',
    body: bodyMatch ? bodyMatch[1].trim() : fullHtml,
  };
}

export function scopeTemplatePreviewCss(css) {
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

export function buildShadowPreviewMarkup(fullHtml) {
  const { css, body } = parseTemplatePreviewHtml(fullHtml);
  return {
    css: scopeTemplatePreviewCss(css),
    body: `<div class="td-preview-root">${body}</div>`,
  };
}
