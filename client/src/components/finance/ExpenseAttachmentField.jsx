import { useState } from 'react';
import { IconEye, IconTrash } from '../Icons';
import { getAttachmentSource, isImageMime, isPdfMime } from '../../utils/expenseAttachment';
import ExpenseAttachmentViewer from './ExpenseAttachmentViewer';

export default function ExpenseAttachmentField({
  attachment,
  existing,
  onFileChange,
  onClear,
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const source = getAttachmentSource(attachment) || getAttachmentSource(existing);

  return (
    <div className="expense-attachment-field span-2">
      <span className="quotes-filter-label">Comprobante (PDF/JPG/PNG)</span>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFileChange} />

      {source && (
        <div className="expense-attachment-preview">
          <div className="expense-attachment-preview-head">
            <span className="expense-attachment-filename" title={source.name}>
              {source.name || 'Archivo adjunto'}
            </span>
            <div className="row-actions">
              <button
                type="button"
                className="btn-icon"
                onClick={() => setViewerOpen(true)}
                title="Ver adjunto"
                aria-label="Ver adjunto"
              >
                <IconEye />
              </button>
              {onClear && (
                <button
                  type="button"
                  className="btn-icon btn-icon-danger"
                  onClick={onClear}
                  title="Quitar adjunto"
                  aria-label="Quitar adjunto"
                >
                  <IconTrash />
                </button>
              )}
            </div>
          </div>
          {isImageMime(source.mime) && (
            <button
              type="button"
              className="expense-attachment-thumb-btn"
              onClick={() => setViewerOpen(true)}
            >
              <img src={source.data} alt="" className="expense-attachment-thumb" />
            </button>
          )}
          {isPdfMime(source.mime) && (
            <button
              type="button"
              className="expense-attachment-pdf-hint"
              onClick={() => setViewerOpen(true)}
            >
              PDF listo — clic para abrir vista completa
            </button>
          )}
        </div>
      )}

      <ExpenseAttachmentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        attachment={source}
      />
    </div>
  );
}
