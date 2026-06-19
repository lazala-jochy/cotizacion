import { DEFAULT_CLOSE_BLOCK_GAP } from '@template-designer/closeBlockTypes';

export default function CloseBlockSettings({ closeBlock, onChange }) {
  const mode = closeBlock?.mode ?? 'fixed';
  const gap = closeBlock?.gapAfterTable ?? DEFAULT_CLOSE_BLOCK_GAP;

  const patch = (partial) => {
    onChange({
      mode: 'fixed',
      gapAfterTable: DEFAULT_CLOSE_BLOCK_GAP,
      ...closeBlock,
      ...partial,
    });
  };

  return (
    <fieldset className="td-close-block-settings">
      <legend>Bloque de cierre (PDF)</legend>
      <p className="muted td-close-block-hint">
        Totales, notas, firma y sello. En modo automático se acercan a la tabla cuando hay pocos
        ítems.
      </p>
      <label className="td-close-block-option">
        <input
          type="radio"
          name="closeBlockMode"
          checked={mode === 'fixed'}
          onChange={() => patch({ mode: 'fixed' })}
        />
        Posición fija (como la diseñaste)
      </label>
      <label className="td-close-block-option">
        <input
          type="radio"
          name="closeBlockMode"
          checked={mode === 'followTable'}
          onChange={() => patch({ mode: 'followTable' })}
        />
        Automática (debajo de la tabla)
      </label>
      {mode === 'followTable' && (
        <label className="td-close-block-gap">
          Espacio tras la tabla (px)
          <input
            type="number"
            min={0}
            max={120}
            step={4}
            value={gap}
            onChange={(e) =>
              patch({ gapAfterTable: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </label>
      )}
    </fieldset>
  );
}
