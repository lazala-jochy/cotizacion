import { useCallback, useState } from 'react';
import { api } from '../api';
import { getAttachmentSource } from '../utils/expenseAttachment';

export function useExpenseListActions({ onReload }) {
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewAttachment, setViewAttachment] = useState(null);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback(async (expense) => {
    setError('');
    try {
      const full = await api.expenses.get(expense.id);
      setEditTarget(full);
      setModalOpen(true);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const openViewAttachment = useCallback(async (expense) => {
    setError('');
    try {
      const full = await api.expenses.get(expense.id);
      const src = getAttachmentSource(full);
      if (src) setViewAttachment(src);
      else setError('Este gasto no tiene adjunto.');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) return;
    setDeleteBusy(true);
    try {
      await api.expenses.remove(deleteTarget.id);
      setDeleteTarget(null);
      onReload?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteTarget, onReload]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
  }, []);

  const handleSaved = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
    onReload?.();
  }, [onReload]);

  return {
    error,
    setError,
    editTarget,
    modalOpen,
    deleteTarget,
    setDeleteTarget,
    deleteBusy,
    viewAttachment,
    setViewAttachment,
    openCreate,
    openEdit,
    openViewAttachment,
    handleConfirmDelete,
    closeModal,
    handleSaved,
  };
}
