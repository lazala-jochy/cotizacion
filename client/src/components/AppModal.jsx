import { useEffect } from 'react';

/**
 * Diálogo modal coherente con paneles y botones de la app.
 */
export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  titleId,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const labelledBy = titleId || 'app-modal-title';

  return (
    <div
      className="app-modal-overlay"
      role="presentation"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={`app-modal-panel app-modal-panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? labelledBy : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <header className="app-modal-header">
            <div className="app-modal-header-text">
              {title && (
                <h2 id={labelledBy} className="app-modal-title">
                  {title}
                </h2>
              )}
              {subtitle && <p className="app-modal-subtitle muted">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm app-modal-close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </header>
        )}

        <div className="app-modal-body">{children}</div>

        {footer && <footer className="app-modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}
