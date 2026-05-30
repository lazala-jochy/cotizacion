import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { createDefaultTemplateDefinition } from '@template-designer/defaultTemplate';

export default function TemplateDesignerList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.templates
      .list()
      .then(setTemplates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setError('');
    try {
      const created = await api.templates.create({
        name: `Plantilla ${templates.length + 1}`,
        definition: createDefaultTemplateDefinition(),
        isDefault: templates.length === 0,
      });
      navigate(`/plantillas/${created.id}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const copy = await api.templates.duplicate(id);
      navigate(`/plantillas/${copy.id}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    try {
      await api.templates.setDefault(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      await api.templates.remove(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Diseñador de plantillas</h1>
          <p>Crea y edita el diseño visual de tus cotizaciones en PDF.</p>
        </div>
        <button type="button" className="btn-primary" onClick={handleCreate}>
          + Nueva plantilla
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel">
        {loading ?
          <p className="muted">Cargando plantillas…</p>
        : templates.length === 0 ?
          <p className="muted">No hay plantillas. Crea la primera.</p>
        : <ul className="template-list">
            {templates.map((t) => (
              <li key={t.id} className="template-list-item">
                <div>
                  <Link to={`/plantillas/${t.id}`} className="template-list-name">
                    {t.name}
                  </Link>
                  {t.is_default && <span className="badge badge-enviada">Predeterminada</span>}
                </div>
                <div className="template-list-actions">
                  {!t.is_default && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => handleSetDefault(t.id)}
                    >
                      Usar por defecto
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => handleDuplicate(t.id)}
                  >
                    Duplicar
                  </button>
                  <Link to={`/plantillas/${t.id}`} className="btn-primary btn-sm">
                    Editar
                  </Link>
                  {templates.length > 1 && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => handleDelete(t.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        }
      </section>
    </div>
  );
}
