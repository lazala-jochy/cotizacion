/**
 * Vista previa del archivo TXT DGII (mismo contenido que se exporta).
 */
export default function DgiiTxtPreview({ content, emptyMessage = 'Sin registros para este período.' }) {
  const text = typeof content === 'string' ? content : '';
  if (!text.trim()) {
    return <p className="muted dgii-txt-preview-empty">{emptyMessage}</p>;
  }

  return (
    <div className="dgii-txt-preview-wrap">
      <pre className="dgii-txt-preview" aria-label="Vista previa TXT DGII">
        {text.replace(/\r\n/g, '\n')}
      </pre>
    </div>
  );
}
