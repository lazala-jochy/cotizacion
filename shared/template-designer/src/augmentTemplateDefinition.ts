import type { QuoteTemplateDefinition, TemplateElement, TemplateElementType } from './types';

/** Campos que deben existir en plantillas antiguas para mostrarse en el PDF. */
const STANDARD_TEMPLATE_PATCHES: TemplateElement[] = [
  {
    id: 'std-company-email',
    type: 'companyEmail',
    x: 40,
    y: 228,
    width: 360,
    height: 22,
    style: { fontSize: 11 },
    zIndex: 2,
  },
  {
    id: 'std-forma-pago',
    type: 'formaPago',
    x: 40,
    y: 948,
    width: 420,
    height: 24,
    style: { fontSize: 11 },
    zIndex: 7,
  },
  {
    id: 'std-ejecutivo',
    type: 'ejecutivo',
    x: 40,
    y: 978,
    width: 420,
    height: 24,
    style: { fontSize: 11 },
    zIndex: 7,
  },
  {
    id: 'std-custom-message',
    type: 'customMessage',
    x: 40,
    y: 900,
    width: 714,
    height: 48,
    style: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', color: '#334155' },
    zIndex: 7,
  },
  {
    id: 'std-signature',
    type: 'signature',
    x: 40,
    y: 1008,
    width: 200,
    height: 72,
    style: { fontSize: 11 },
    zIndex: 50,
  },
];

function hasPlaceholderInFreeText(
  elements: TemplateElement[],
  pattern: RegExp
): boolean {
  return elements.some(
    (el) => el.type === 'freeText' && pattern.test(String(el.content || ''))
  );
}

function isTypeCovered(
  elements: TemplateElement[],
  type: TemplateElementType,
  freeTextPattern?: RegExp
): boolean {
  if (elements.some((el) => el.type === type)) return true;
  if (freeTextPattern && hasPlaceholderInFreeText(elements, freeTextPattern)) return true;
  return false;
}

/** Agrega campos faltantes a plantillas guardadas antes de la actualización. */
export function augmentTemplateDefinition(
  definition: QuoteTemplateDefinition
): QuoteTemplateDefinition {
  const elements = [...definition.elements];
  const ids = new Set(elements.map((el) => el.id));

  for (const patch of STANDARD_TEMPLATE_PATCHES) {
    const freeTextPattern =
      patch.type === 'formaPago'
        ? /\{\{forma_pago/
          : patch.type === 'ejecutivo'
            ? /\{\{ejecutivo/
            : patch.type === 'customMessage'
              ? /\{\{mensaje_pdf\}\}/
              : patch.type === 'signature'
            ? /\{\{signature\}\}/
            : patch.type === 'sello'
              ? /\{\{sello/
              : undefined;

    if (isTypeCovered(elements, patch.type, freeTextPattern)) continue;
    if (ids.has(patch.id)) continue;

    elements.push(patch);
    ids.add(patch.id);
  }

  if (elements.length === definition.elements.length) return definition;
  return { ...definition, elements };
}
