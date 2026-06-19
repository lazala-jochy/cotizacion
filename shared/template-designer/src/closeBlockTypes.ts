import type { CloseBlockConfig, CloseBlockMode, TemplateElementType } from './types';

/** Tipos que forman el bloque de cierre (totales, firma, notas…). */
export const CLOSE_BLOCK_TYPES = new Set<TemplateElementType>([
  'formaPago',
  'subtotal',
  'tax',
  'discount',
  'total',
  'notes',
  'customMessage',
  'signature',
  'sello',
  'ejecutivo',
]);

export const DEFAULT_CLOSE_BLOCK_GAP = 20;
export const DEFAULT_CLOSE_BLOCK_MODE: CloseBlockMode = 'fixed';

export function getCloseBlockConfig(
  config?: CloseBlockConfig | null
): Required<Pick<CloseBlockConfig, 'mode' | 'gapAfterTable'>> &
  Pick<CloseBlockConfig, 'respectDesignedFloor'> {
  return {
    mode: config?.mode ?? DEFAULT_CLOSE_BLOCK_MODE,
    gapAfterTable: config?.gapAfterTable ?? DEFAULT_CLOSE_BLOCK_GAP,
    respectDesignedFloor: config?.respectDesignedFloor,
  };
}

export function isCloseBlockType(type: TemplateElementType): boolean {
  return CLOSE_BLOCK_TYPES.has(type);
}

export function canUseLayoutPin(type: TemplateElementType): boolean {
  return (
    isCloseBlockType(type) ||
    type === 'freeText' ||
    type === 'customMessage' ||
    type === 'horizontalLine'
  );
}

export function isLayoutPinned(el: { layoutPin?: 'fixed' | 'follow' }): boolean {
  return el.layoutPin === 'fixed';
}
