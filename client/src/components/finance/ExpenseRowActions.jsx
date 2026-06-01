import { IconEdit, IconEye, IconTrash } from '../Icons';

/**
 * Acciones de fila (mismo patrón que cotizaciones / facturas).
 */
export default function ExpenseRowActions({
  onEdit,
  onDelete,
  onViewAttachment,
  hasAttachment = false,
  editLabel = 'Editar gasto',
  deleteLabel = 'Eliminar gasto',
}) {
  return (
    <div className="row-actions">
      {hasAttachment && onViewAttachment && (
        <button
          type="button"
          className="btn-icon"
          onClick={onViewAttachment}
          title="Ver adjunto"
          aria-label="Ver adjunto"
        >
          <IconEye />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          className="btn-icon"
          onClick={onEdit}
          title="Editar"
          aria-label={editLabel}
        >
          <IconEdit />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="btn-icon btn-icon-danger"
          onClick={onDelete}
          title="Eliminar"
          aria-label={deleteLabel}
        >
          <IconTrash />
        </button>
      )}
    </div>
  );
}
