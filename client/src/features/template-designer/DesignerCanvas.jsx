import { useCallback, useRef } from 'react';
import { getCatalogEntry } from './utils';
import { getDefaultFieldLabel, isDataBoundField } from '@template-designer/elementFieldLabels';

const MIN_SIZE = 24;

function CanvasElement({
  el,
  isSelected,
  pageWidth,
  pageHeight,
  onSelect,
  onUpdateElement,
}) {
  const label = getCatalogEntry(el.type).label;
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const onDragMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || e.target.closest('.td-canvas-resize-handle')) return;
      e.stopPropagation();
      onSelect(el.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const origX = el.x;
      const origY = el.y;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const x = Math.max(0, Math.min(pageWidth - el.width, origX + dx));
        const y = Math.max(0, Math.min(pageHeight - el.height, origY + dy));
        onUpdateElement(el.id, { x, y });
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [el, onSelect, onUpdateElement, pageHeight, pageWidth]
  );

  const onResizeMouseDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(el.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const origW = el.width;
      const origH = el.height;

      const onMove = (ev) => {
        const w = Math.max(
          MIN_SIZE,
          Math.min(pageWidth - el.x, origW + (ev.clientX - startX))
        );
        const h = Math.max(
          MIN_SIZE,
          Math.min(pageHeight - el.y, origH + (ev.clientY - startY))
        );
        onUpdateElement(el.id, { width: w, height: h });
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [el, onSelect, onUpdateElement, pageHeight, pageWidth]
  );

  return (
    <div
      className={`td-canvas-element-wrap${isSelected ? ' td-canvas-element-wrap--selected' : ''}`}
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        zIndex: el.zIndex ?? 1,
      }}
      onMouseDown={onDragMouseDown}
      ref={dragRef}
    >
      <div
        className={`td-canvas-element${isSelected ? ' td-canvas-element--selected' : ''}`}
        style={{
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          fontSize: el.style?.fontSize,
          fontWeight: el.style?.fontWeight,
          fontStyle: el.style?.fontStyle,
          color: el.style?.color,
          textAlign: el.style?.textAlign,
          fontFamily: el.style?.fontFamily,
          backgroundColor: el.style?.backgroundColor,
        }}
      >
        <span className="td-canvas-element-type">
          {label}
          {el.layoutPin === 'fixed' && (
            <span className="td-canvas-pin-badge" title="Posición fija en PDF">
              {' '}
              · fijo
            </span>
          )}
        </span>
        {el.type === 'productTable' ?
          <span className="muted">Tabla de ítems</span>
        : el.type === 'companyLogo' || el.type === 'image' || el.type === 'signature' || el.type === 'sello' ?
          <span className="muted">Imagen</span>
        : el.type === 'qrCode' ?
          <span className="muted">QR</span>
        : el.type === 'customMessage' ?
          <span className="muted td-canvas-element-preview">Mensaje personalizado…</span>
        : el.type === 'horizontalLine' ?
          <span
            className="td-canvas-line-preview"
            style={{ borderTopColor: el.style?.color || '#94a3b8' }}
          />
        : <span className="td-canvas-element-preview">
            {isDataBoundField(el.type)
              ? (el.showLabel === false
                  ? '(solo valor)'
                  : `${el.fieldLabel?.trim() || getDefaultFieldLabel(el.type)}: …`)
              : (el.content || '').slice(0, 80)}
          </span>
        }
      </div>
      {isSelected && (
        <button
          type="button"
          className="td-canvas-resize-handle"
          aria-label="Redimensionar"
          onMouseDown={onResizeMouseDown}
          ref={resizeRef}
        />
      )}
    </div>
  );
}

export default function DesignerCanvas({
  definition,
  selectedId,
  onSelect,
  onUpdateElement,
}) {
  const { pageWidth, pageHeight, elements } = definition;

  return (
    <div
      className="td-canvas-scroll"
      onClick={() => onSelect(null)}
      role="presentation"
    >
      <div
        className="td-canvas-page"
        style={{ width: pageWidth, height: pageHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {elements.map((el) => (
          <CanvasElement
            key={el.id}
            el={el}
            isSelected={el.id === selectedId}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            onSelect={onSelect}
            onUpdateElement={onUpdateElement}
          />
        ))}
      </div>
    </div>
  );
}
