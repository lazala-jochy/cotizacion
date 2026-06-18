import { ELEMENT_CATALOG, getCatalogEntry } from '@template-designer/elementCatalog';
import type { QuoteTemplateDefinition, TemplateElement, TemplateElementType } from '@template-designer/types';

export { ELEMENT_CATALOG, getCatalogEntry };
export type { QuoteTemplateDefinition, TemplateElement, TemplateElementType };

export function createElement(type: TemplateElementType, x = 40, y = 40): TemplateElement {
  const entry = getCatalogEntry(type);
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    x,
    y,
    width: entry.defaultWidth,
    height: entry.defaultHeight,
    style: { fontSize: 12, color: '#0f172a' },
    ...(entry.defaultContent ? { content: entry.defaultContent } : {}),
    zIndex: 1,
  };
}

export function newBlankDefinition(): QuoteTemplateDefinition {
  return {
    version: 1,
    pageWidth: 794,
    pageHeight: 1123,
    elements: [],
  };
}
