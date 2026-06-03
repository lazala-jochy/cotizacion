import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { formatMoney } from '../../utils/formatMoney';
import ExpenseFormModal from './ExpenseFormModal';
import ExpenseListTable from './ExpenseListTable';
import ExpenseAttachmentViewer from './ExpenseAttachmentViewer';
import ConfirmModal from '../ConfirmModal';
import { useExpenseListActions } from '../../hooks/useExpenseListActions';

export default function InvoiceExpensesSection({
  invoiceId,
  clientId,
  clientRnc,
  fiscalNumber,
  onChanged,
}) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = useCallback(() => {
    setLoading(true);
    return api.expenses
      .list({ invoice_id: invoiceId })
      .then(setExpenses)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const actions = useExpenseListActions({
    onReload: () => {
      loadExpenses();
      onChanged?.();
    },
  });

  useEffect(() => {
    loadExpenses().catch((e) => actions.setError(e.message));
  }, [loadExpenses, actions.setError]);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <section className="panel quotes-panel no-print">
      <div className="panel-header-row">
        <h2 className="panel-title">Gastos asociados</h2>
        <button type="button" className="btn-ghost btn-sm" onClick={actions.openCreate}>
          + Agregar gasto
        </button>
      </div>

      {actions.error && <div className="alert alert-error">{actions.error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <>
          <ExpenseListTable
            expenses={expenses}
            emptyMessage="Sin gastos vinculados a esta factura."
            showRnc
            showNcf
            onEdit={actions.openEdit}
            onDelete={actions.setDeleteTarget}
            onViewAttachment={actions.openViewAttachment}
          />
          <p className="muted">
            Total gastos: <strong>{formatMoney(total)}</strong>
          </p>
        </>
      )}

      <ExpenseFormModal
        open={actions.modalOpen}
        expense={actions.editTarget}
        onClose={actions.closeModal}
        onSaved={actions.handleSaved}
        defaults={{
          invoice_id: Number(invoiceId),
          client_id: clientId || null,
          rnc: clientRnc || '',
          ncf: fiscalNumber || '',
        }}
      />

      <ExpenseAttachmentViewer
        open={Boolean(actions.viewAttachment)}
        onClose={() => actions.setViewAttachment(null)}
        attachment={actions.viewAttachment}
      />

      <ConfirmModal
        open={Boolean(actions.deleteTarget)}
        onClose={() => !actions.deleteBusy && actions.setDeleteTarget(null)}
        title="Quitar gasto"
        subtitle={actions.deleteTarget?.description}
        confirmLabel={actions.deleteBusy ? 'Eliminando…' : 'Quitar'}
        onConfirm={actions.handleConfirmDelete}
        busy={actions.deleteBusy}
        confirmVariant="danger"
      >
        <p className="app-modal-message">
          Se eliminará el gasto <strong>{actions.deleteTarget?.description}</strong> de forma
          permanente.
        </p>
      </ConfirmModal>
    </section>
  );
}
