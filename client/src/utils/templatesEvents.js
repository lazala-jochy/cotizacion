export const TEMPLATES_UPDATED_EVENT = 'templates:updated';

/** Avisar a vistas de documento que recarguen la plantilla predeterminada. */
export function notifyTemplatesUpdated(detail = {}) {
  window.dispatchEvent(new CustomEvent(TEMPLATES_UPDATED_EVENT, { detail }));
}
