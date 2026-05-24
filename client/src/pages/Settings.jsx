import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyEmisor = {
  nombre: '',
  rnc: '',
  direccion: '',
  telefono: '',
  email: '',
};

const ejemploEmisor = {
  nombre: 'ALTITUDE CONSULTING',
  rnc: '04900920846',
  direccion: 'av princial, la mata, cotui, rd',
  telefono: '849-405-8727',
  email: 'jochylazala@gmail.com',
};

export default function Settings() {
  const [form, setForm] = useState(emptyEmisor);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.emisor
      .get()
      .then(setForm)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const saved = await api.emisor.update(form);
      setForm(saved);
      setSuccess('Datos del emisor guardados.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const loadExample = () => {
    setForm(ejemploEmisor);
    setSuccess('');
    setError('');
  };

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Datos del emisor</h1>
          <p>
            Información de tu empresa que aparece en las cotizaciones (nombre, RNC, dirección, etc.)
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="panel">
        <p className="panel-hint">
          Cada cuenta configura su propio emisor. Los datos de ejemplo (ALTITUDE CONSULTING) son solo
          una referencia del formato esperado — puedes cargarlos y editarlos.
        </p>
        <button type="button" className="btn-ghost btn-sm example-btn" onClick={loadExample}>
          Cargar datos de ejemplo
        </button>

        <form onSubmit={handleSubmit} className="form-grid emisor-form">
          <label>
            Nombre / razón social *
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Mi Empresa SRL"
              required
            />
          </label>
          <label>
            RNC
            <input
              value={form.rnc}
              onChange={(e) => setForm({ ...form, rnc: e.target.value })}
              placeholder="Ej: 04900920846"
            />
          </label>
          <label className="span-2">
            Dirección
            <input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Ej: av principal, la mata, cotui, rd"
            />
          </label>
          <label>
            Teléfono
            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="Ej: 849-405-8727"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Ej: contacto@miempresa.com"
            />
          </label>
          <div className="form-actions span-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar emisor'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
