import AppModal from './AppModal';

/**
 * Pregunta si el PDF de la cotización debe incluir la firma y el sello
 * de la empresa (configurados en Empresa → Firma y sello) antes de descargar.
 */
export default function QuoteDownloadOptionsModal({ open, onClose, onChoose, busy }) {
  return (
    <AppModal
      open={open}
      onClose={() => !busy && onClose()}
      title="Descargar cotización"
      subtitle="¿Deseas incluir la firma y el sello de la empresa en el PDF?"
      size="sm"
      busy={busy}
      busyMessage="Generando PDF…"
      footer={
        <div className="app-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onChoose(false)}
            disabled={busy}
          >
            Sin firma y sello
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onChoose(true)}
            disabled={busy}
          >
            Con firma y sello
          </button>
        </div>
      }
    />
  );
}
