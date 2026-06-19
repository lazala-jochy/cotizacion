import { getCloseBlockConfig, isCloseBlockType } from './closeBlockTypes';
import { shouldRenderElement } from './elementVisibility';
import type { PlaceholderContext, QuoteTemplateDefinition, TemplateElement } from './types';

/** Altura estimada de la tabla según filas (calibrada con TEMPLATE_PAGE_STYLES). */
const TABLE_HEADER_PX = 32;
const TABLE_ROW_PX = 28;
const TABLE_BORDER_PX = 2;
const TABLE_EMPTY_PX = 40;
const PAGE_MARGIN_BOTTOM_PX = 24;
const COLUMN_BUCKET_PX = 40;
const STACK_GAP_PX = 6;

export interface ResolvedBox {
  x: number;
  y: number;
  width: number;
  height: number | 'auto';
}

export interface QuoteItemLike {
  descripcion?: string;
  cantidad?: number;
}

export interface ResolveTemplateLayoutOptions {
  context?: PlaceholderContext;
}

export function countQuoteItems(items: QuoteItemLike[] | null | undefined): number {
  return (items || []).filter(
    (i) => (Number(i.cantidad) || 0) > 0 && String(i.descripcion || '').trim()
  ).length;
}

export function estimateTableHeight(itemCount: number): number {
  if (itemCount <= 0) return TABLE_EMPTY_PX;
  return TABLE_HEADER_PX + itemCount * TABLE_ROW_PX + TABLE_BORDER_PX;
}

function columnKey(el: TemplateElement): number {
  return Math.round(el.x / COLUMN_BUCKET_PX) * COLUMN_BUCKET_PX;
}

function groupByColumn(elements: TemplateElement[]): Map<number, TemplateElement[]> {
  const groups = new Map<number, TemplateElement[]>();
  for (const el of elements) {
    const key = columnKey(el);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(el);
  }
  return groups;
}

function elementHeight(el: TemplateElement, resolved: Map<string, ResolvedBox>): number {
  const box = resolved.get(el.id);
  if (box && box.height !== 'auto') return box.height;
  return el.height;
}

/** Reapila elementos visibles en una columna, eliminando huecos de campos vacíos. */
function reflowColumn(
  columnEls: TemplateElement[],
  resolved: Map<string, ResolvedBox>,
  isVisible: (el: TemplateElement) => boolean,
  startY?: number
): void {
  const sorted = [...columnEls].sort((a, b) => a.y - b.y);
  const visible = sorted.filter(isVisible);
  if (!visible.length) return;

  if (startY != null) {
    let y = startY;
    for (const el of visible) {
      const box = resolved.get(el.id);
      if (!box) continue;
      box.y = y;
      y += elementHeight(el, resolved) + STACK_GAP_PX;
    }
    return;
  }

  const hiddenHeightBetween = (from: TemplateElement, to: TemplateElement): number => {
    let reduction = 0;
    for (const el of sorted) {
      if (el.y <= from.y) continue;
      if (el.y >= to.y) break;
      if (!isVisible(el)) reduction += el.height;
    }
    return reduction;
  };

  const first = visible[0];
  const firstBox = resolved.get(first.id);
  if (firstBox) firstBox.y = first.y;

  for (let i = 1; i < visible.length; i++) {
    const prev = visible[i - 1];
    const el = visible[i];
    const box = resolved.get(el.id);
    if (!box) continue;
    box.y = el.y - hiddenHeightBetween(prev, el);
  }
}

function initResolvedBoxes(elements: TemplateElement[]): Map<string, ResolvedBox> {
  const resolved = new Map<string, ResolvedBox>();
  for (const el of elements) {
    resolved.set(el.id, {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.type === 'productTable' ? 'auto' : el.height,
    });
  }
  return resolved;
}

function applyVisibilityReflow(
  definition: QuoteTemplateDefinition,
  resolved: Map<string, ResolvedBox>,
  context: PlaceholderContext,
  itemCount: number
): void {
  const isVisible = (el: TemplateElement) => shouldRenderElement(el, context);
  const tableEl = definition.elements.find((el) => el.type === 'productTable');
  const closeConfig = getCloseBlockConfig(definition.closeBlock);
  const closeEls = definition.elements.filter((el) => isCloseBlockType(el.type));

  if (closeConfig.mode === 'followTable' && tableEl && closeEls.length) {
    const startY = tableEl.y + estimateTableHeight(itemCount) + closeConfig.gapAfterTable;
    for (const columnEls of groupByColumn(closeEls).values()) {
      reflowColumn(columnEls, resolved, isVisible, startY);
    }
    return;
  }

  const reflowEls = definition.elements.filter((el) => el.type !== 'productTable');
  for (const columnEls of groupByColumn(reflowEls).values()) {
    reflowColumn(columnEls, resolved, isVisible);
  }
}

function clampCloseBlockToPage(
  definition: QuoteTemplateDefinition,
  resolved: Map<string, ResolvedBox>,
  context: PlaceholderContext
): void {
  const closeEls = definition.elements.filter(
    (el) => isCloseBlockType(el.type) && shouldRenderElement(el, context)
  );
  if (!closeEls.length) return;

  let maxBottom = 0;
  for (const el of closeEls) {
    const box = resolved.get(el.id);
    if (!box) continue;
    maxBottom = Math.max(maxBottom, box.y + elementHeight(el, resolved));
  }

  const limit = definition.pageHeight - PAGE_MARGIN_BOTTOM_PX;
  if (maxBottom <= limit) return;

  const overflow = maxBottom - limit;
  for (const el of closeEls) {
    const box = resolved.get(el.id);
    if (box) box.y -= overflow;
  }
}

/**
 * Calcula posiciones finales para PDF.
 * Encabezado y cliente: coordenadas del diseñador (con colapso si faltan datos).
 * Tabla: altura automática.
 * Bloque de cierre: fijo o relativo a la tabla.
 */
export function resolveTemplateLayout(
  definition: QuoteTemplateDefinition,
  itemCount: number,
  options: ResolveTemplateLayoutOptions = {}
): Map<string, ResolvedBox> {
  const resolved = initResolvedBoxes(definition.elements);

  if (options.context) {
    applyVisibilityReflow(definition, resolved, options.context, itemCount);
    clampCloseBlockToPage(definition, resolved, options.context);
  } else {
    const tableEl = definition.elements.find((el) => el.type === 'productTable');
    const closeConfig = getCloseBlockConfig(definition.closeBlock);
    if (tableEl && closeConfig.mode === 'followTable') {
      const closeEls = definition.elements.filter((el) => isCloseBlockType(el.type));
      const startY = tableEl.y + estimateTableHeight(itemCount) + closeConfig.gapAfterTable;
      for (const columnEls of groupByColumn(closeEls).values()) {
        reflowColumn(columnEls, resolved, () => true, startY);
      }
    }
  }

  return resolved;
}
