import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyEmisor = {
  nombre: '',
  rnc: '',
  direccion: '',
  telefono: '',
  email: '',
  logo: null,
  smtp_user: '',
  smtp_password: '',
  smtp_configured: false,
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export default function Settings() {
  const [form, setForm] = useState(emptyEmisor);
  const [licenseState, setLicenseState] = useState({ loading: true, valid: false, license: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  useEffect(() => {
    api.emisor
      .get()
      .then((data) => setForm({ ...emptyEmisor, ...data }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    if (!window.electronAPI?.getActivationState) {
      setLicenseState({ loading: false, valid: true, license: null });
      return;
    }
    window.electronAPI
      .getActivationState()
      .then((state) => setLicenseState({ loading: false, ...state }))
      .catch(() =>
        setLicenseState({
          loading: false,
          valid: false,
          reason: 'No se pudo verificar la licencia',
          license: null,
        })
      );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.smtp_configured;
      if (payload.smtp_password !== undefined) {
        payload.smtp_password = String(payload.smtp_password);
      }
      const saved = await api.emisor.update(payload);
      setForm({ ...emptyEmisor, ...saved });
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

      <section className="panel license-customer-panel">
        <div className="panel-header-row">
          <h2>Licencia del sistema</h2>
        </div>
        {licenseState.loading ? (
          <p className="muted">Verificando licencia…</p>
        ) : (
          <dl className="emisor-dl license-customer-dl">
            <div>
              <dt>Estado</dt>
              <dd className={licenseState.valid ? 'license-ok' : 'license-error'}>
                {licenseState.valid ? 'Activa' : 'No activa'}
              </dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd className="text-break">{licenseState.license?.plan || '—'}</dd>
            </div>
            <div>
              <dt>Expira</dt>
              <dd>{formatDate(licenseState.expiresAt)}</dd>
            </div>
            <div>
              <dt>Licencia</dt>
              <dd className="text-break">{licenseState.license?.licenseId || '—'}</dd>
            </div>
          </dl>
        )}
      </section>

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

          <div className="form-section-title span-2">
            <h2>Envío por Gmail</h2>
            <p className="muted">
              Cuenta de Gmail para enviar cotizaciones por correo. Si tienes verificación en dos pasos, crea una{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
              >
                contraseña de aplicación
              </a>{' '}
              y úsala aquí (no tu contraseña habitual).
            </p>
          </div>
          <label>
            Usuario (correo Gmail) *
            <input
              type="email"
              value={form.smtp_user}
              onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
              placeholder="tuempresa@gmail.com"
              autoComplete="username"
            />
          </label>
          <label>
            Contraseña
            <div className="password-field-wrap">
              <input
                type={showSmtpPassword ? 'text' : 'password'}
                value={form.smtp_password}
                onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
                placeholder="Contraseña de aplicación de Gmail"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-ghost btn-sm btn-password-toggle"
                onClick={() => setShowSmtpPassword((v) => !v)}
                aria-label={showSmtpPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showSmtpPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
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
