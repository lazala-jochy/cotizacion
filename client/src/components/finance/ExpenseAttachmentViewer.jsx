import AppModal from '../AppModal';
import { isImageMime, isPdfMime } from '../../utils/expenseAttachment';

export default function ExpenseAttachmentViewer({ open, onClose, attachment }) {
  if (!attachment?.data) return null;

  const { data, mime, name } = attachment;
  const title = name || 'Adjunto';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={isPdfMime(mime) ? 'Documento PDF' : isImageMime(mime) ? 'Imagen' : 'Archivo'}
      size="lg"
      footer={
        <div className="app-modal-actions">
          <a href={data} download={name || 'adjunto'} className="btn-ghost">
            Descargar
          </a>
          <button type="button" className="btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      <div className="expense-attachment-viewer">
        {isImageMime(mime) && (
          <img src={data} alt={title} className="expense-attachment-viewer-img" />
        )}
        {isPdfMime(mime) && (
          <iframe
            title={title}
            src={data}
            className="expense-attachment-viewer-pdf"
          />
        )}
        {!isImageMime(mime) && !isPdfMime(mime) && (
          <p className="muted">Vista previa no disponible. Use Descargar.</p>
        )}
      </div>
    </AppModal>
  );
}
