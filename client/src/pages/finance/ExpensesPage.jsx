import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { formatMoney } from '../../utils/formatMoney';
import ExpenseFormModal from '../../components/finance/ExpenseFormModal';
import ExpenseRowActions from '../../components/finance/ExpenseRowActions';
import ExpenseAttachmentViewer from '../../components/finance/ExpenseAttachmentViewer';
import ConfirmModal from '../../components/ConfirmModal';
import { getAttachmentSource } from '../../utils/expenseAttachment';
import MonthYearFilterFields from '../../components/filters/MonthYearFilterFields';
import { dateRangeFromYearMonth, getDefaultYearMonth } from '../../utils/dateRangeFilters';

const defaultPeriod = getDefaultYearMonth();

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewAttachment, setViewAttachment] = useState(null);
  const [yearFilter, setYearFilter] = useState(defaultPeriod.year);
  const [monthFilter, setMonthFilter] = useState(defaultPeriod.month);
  const [categoryId, setCategoryId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const { from, to } = dateRangeFromYearMonth(yearFilter, monthFilter);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (categoryId) params.category_id = categoryId;
    api.expenses
      .list(params)
      .then(setExpenses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [yearFilter, monthFilter, categoryId]);

  useEffect(() => {
    api.expenses.categories().then(setCategories).catch(() => {});
    load();
  }, [load]);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = async (expense) => {
    try {
      const full = await api.expenses.get(expense.id);
      setEditTarget(full);
      setModalOpen(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const openViewAttachment = async (expense) => {
    try {
      const full = await api.expenses.get(expense.id);
      const src = getAttachmentSource(full);
      if (src) setViewAttachment(src);
      else setError('Este gasto no tiene adjunto.');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.expenses.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <section className="panel">
        <div className="panel-header-row">
          <h2 className="panel-title">Gastos</h2>
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
            + Nuevo gasto
          </button>
        </div>

        <div className="quotes-filters-bar" role="group" aria-label="Filtros de gastos">
          <MonthYearFilterFields
            year={yearFilter}
            month={monthFilter}
            onYearChange={setYearFilter}
            onMonthChange={setMonthFilter}
            idPrefix="expenses"
          />
          <label className="quotes-filter-field">
            <span className="quotes-filter-label">Categoría</span>
            <select
              className="quotes-filter-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="muted">
          Total filtrado: <strong>{formatMoney(total)}</strong> · {expenses.length} registros
        </p>
      </section>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <section className="panel quotes-panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>RNC</th>
                  <th>NCF</th>
                  <th className="num">Monto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      No hay gastos con estos filtros.
                    </td>
                  </tr>
                )}
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.expense_date}</td>
                    <td>{e.category_name}</td>
                    <td>{e.description}</td>
                    <td>{e.rnc || '—'}</td>
                    <td>{e.ncf || '—'}</td>
                    <td className="num">{formatMoney(e.amount)}</td>
                    <td>
                      <ExpenseRowActions
                        hasAttachment={Boolean(e.has_attachment)}
                        onViewAttachment={() => openViewAttachment(e)}
                        onEdit={() => openEdit(e)}
                        onDelete={() => setDeleteTarget(e)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ExpenseFormModal
        open={modalOpen}
        expense={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          setEditTarget(null);
          load();
        }}
      />

      <ExpenseAttachmentViewer
        open={Boolean(viewAttachment)}
        onClose={() => setViewAttachment(null)}
        attachment={viewAttachment}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        title="Eliminar gasto"
        subtitle={deleteTarget?.description}
        confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar'}
        onConfirm={handleConfirmDelete}
        busy={deleteBusy}
        confirmVariant="danger"
      >
        <p className="app-modal-message">
          Se eliminará el gasto <strong>{deleteTarget?.description}</strong> de forma permanente.
        </p>
      </ConfirmModal>
    </>
  );
}
