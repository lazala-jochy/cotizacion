import { useEffect, useState } from 'react';
import { api } from '../../api';
import AppModal from '../../components/AppModal';
import { IconEdit, IconTrash } from '../../components/Icons';

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [edit, setEdit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    api.expenses
      .categories()
      .then(setCategories)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.expenses.createCategory({ name, description });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!edit) return;
    try {
      await api.expenses.updateCategory(edit.id, { name: edit.name, description: edit.description });
      setModalOpen(false);
      setEdit(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.expenses.deleteCategory(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <section className="panel">
        <h2 className="panel-title">Categorías de gastos</h2>
        <p className="muted panel-desc">
          Categorías predeterminadas según prácticas contables. Puede agregar las suyas.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form className="form-grid form-grid--inline" onSubmit={handleCreate}>
          <label>
            Nueva categoría
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Descripción
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary btn-sm">
              Agregar
            </button>
          </div>
        </form>
      </section>

      <section className="panel quotes-panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="muted">{c.description || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          setEdit({ ...c });
                          setModalOpen(true);
                        }}
                        title="Editar"
                        aria-label="Editar categoría"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDelete(c.id)}
                        title="Eliminar"
                        aria-label="Eliminar categoría"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AppModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Editar categoría"
        size="sm"
        footer={
          <div className="app-modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="edit-cat-form" className="btn-primary">
              Guardar
            </button>
          </div>
        }
      >
        {edit && (
          <form id="edit-cat-form" className="form-grid" onSubmit={handleUpdate}>
            <label className="span-2">
              Nombre
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label className="span-2">
              Descripción
              <input
                value={edit.description || ''}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              />
            </label>
          </form>
        )}
      </AppModal>
    </>
  );
}
