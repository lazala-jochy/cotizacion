import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyEmisor = {
  nombre: '',
  rnc: '',
  direccion: '',
  telefono: '',
  email: '',
  logo: null,
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

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
      setSuccess('Datos de la empresa guardados.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El logo debe ser una imagen');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('El logo no puede superar 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logo: reader.result }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Datos de la empresa</h1>
          <p>
            Información de tu empresa que aparece en las cotizaciones (razón social, RNC, dirección, etc.)
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="panel">
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
          <label className="span-2 logo-upload-label">
            Logo
            <div className="logo-upload-box">
              {form.logo && (
                <div className="logo-preview-wrap">
                  <img src={form.logo} alt="Logo" />
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setForm({ ...form, logo: null })}
                  >
                    Quitar logo
                  </button>
                </div>
              )}
              {!form.logo && <p className="logo-hint">PNG o JPG, máx. 2 MB</p>}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleLogoChange}
              />
            </div>
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
              {saving ? 'Guardando…' : 'Guardar empresa'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
