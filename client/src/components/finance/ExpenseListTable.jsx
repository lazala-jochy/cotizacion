import { formatMoney } from '../../utils/formatMoney';
import { resolveExpenseItbis } from '../../utils/expenseItbis';
import ExpenseRowActions from './ExpenseRowActions';

/**
 * Tabla de gastos con acciones estándar (ver adjunto, editar, eliminar).
 */
export default function ExpenseListTable({
  expenses,
  emptyMessage,
  onEdit,
  onDelete,
  onViewAttachment,
  showRnc = true,
  showNcf = true,
}) {
  const colCount = 5 + (showRnc ? 1 : 0) + (showNcf ? 1 : 0) + 1;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {showRnc && <th>RNC</th>}
            {showNcf && <th>NCF</th>}
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Fecha</th>
            <th className="num">Monto</th>
            <th className="num">ITBIS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 && (
            <tr>
              <td colSpan={colCount} className="muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {expenses.map((e) => (
            <tr key={e.id}>
              {showRnc && <td>{e.rnc || '—'}</td>}
              {showNcf && <td>{e.ncf ? <code>{e.ncf}</code> : '—'}</td>}
              <td>{e.description}</td>
              <td>{e.category_name}</td>
              <td>{e.expense_date}</td>
              <td className="num">{formatMoney(e.amount)}</td>
              <td className="num">{formatMoney(resolveExpenseItbis(e))}</td>
              <td>
                <ExpenseRowActions
                  hasAttachment={Boolean(e.has_attachment)}
                  onViewAttachment={onViewAttachment ? () => onViewAttachment(e) : undefined}
                  onEdit={onEdit ? () => onEdit(e) : undefined}
                  onDelete={onDelete ? () => onDelete(e) : undefined}
                  deleteLabel="Quitar gasto"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
