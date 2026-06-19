import AppModal from './AppModal';

/**
 * Confirmación con acciones primaria / secundaria (misma línea visual que el resto de la app).
 */
export default function ConfirmModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  busy = false,
  busyMessage,
  error = '',
  confirmVariant = 'primary',
  titleId,
}) {
  const handleConfirm = async () => {
    await onConfirm?.();
  };

  const resolvedBusyMessage =
    busyMessage ||
    (confirmLabel.toLowerCase().includes('eliminar') ? 'Eliminando…'
    : confirmLabel.toLowerCase().includes('anular') ? 'Anulando…'
    : 'Procesando…');

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      titleId={titleId}
      size="sm"
      busy={busy}
      busyMessage={resolvedBusyMessage}
      closeOnOverlay={!busy}
      footer={
        <div className="app-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              confirmVariant === 'danger' ? 'btn-ghost danger' : 'btn-primary'
            }
            onClick={handleConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      {children}
    </AppModal>
  );
}
