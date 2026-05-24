import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El logo debe ser una imagen (PNG, JPG, etc.)'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      reject(new Error('El logo no puede superar 2 MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [empresa, setEmpresa] = useState({
    razon_social: '',
    rnc: '',
    logo: null,
    logoPreview: null,
  });

  const [cuenta, setCuenta] = useState({
    nombre: '',
    email: '',
    password: '',
    confirm: '',
    direccion: '',
    telefono: '',
    emisor_email: '',
  });

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    setError('');
    if (!file) return;
    try {
      const dataUrl = await readLogoFile(file);
      setEmpresa((prev) => ({ ...prev, logo: dataUrl, logoPreview: dataUrl }));
    } catch (err) {
      setError(err.message);
      e.target.value = '';
    }
  };

  const removeLogo = () => {
    setEmpresa((prev) => ({ ...prev, logo: null, logoPreview: null }));
  };

  const goNext = (e) => {
    e.preventDefault();
    setError('');
    if (!empresa.razon_social.trim()) {
      setError('La razón social es requerida');
      return;
    }
    if (!empresa.rnc.trim()) {
      setError('El RNC es requerido');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (cuenta.password !== cuenta.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const { user, token } = await api.register({
        razon_social: empresa.razon_social,
        rnc: empresa.rnc,
        logo: empresa.logo,
        nombre: cuenta.nombre,
        email: cuenta.email,
        password: cuenta.password,
        direccion: cuenta.direccion,
        telefono: cuenta.telefono,
        emisor_email: cuenta.emisor_email,
      });
      login(user, token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wizard">
        <div className="auth-wizard">
          <aside className="auth-wizard-side">
            <span className="brand-mark lg">C</span>
            <h1>Crear cuenta</h1>
            <p className="auth-wizard-desc">
              {step === 1
                ? 'Paso 1: datos de tu empresa'
                : 'Paso 2: tu usuario y contacto'}
            </p>
            <ol className="wizard-steps">
              <li className={step === 1 ? 'active' : step > 1 ? 'done' : ''}>
                <span>1</span> Empresa
              </li>
              <li className={step === 2 ? 'active' : ''}>
                <span>2</span> Cuenta
              </li>
            </ol>
          </aside>

          <div className="auth-wizard-main">
            {error && <div className="alert alert-error">{error}</div>}

            {step === 1 && (
              <form onSubmit={goNext} className="wizard-form">
                <h2>Datos de la empresa</h2>
                <div className="wizard-fields-three">
                  <label>
                    Razón social *
                    <input
                      type="text"
                      value={empresa.razon_social}
                      onChange={(e) =>
                        setEmpresa({ ...empresa, razon_social: e.target.value })
                      }
                      placeholder="Ej: Mi Empresa SRL"
                      required
                    />
                  </label>
                  <label>
                    RNC *
                    <input
                      type="text"
                      value={empresa.rnc}
                      onChange={(e) => setEmpresa({ ...empresa, rnc: e.target.value })}
                      placeholder="Ej: 04900920846"
                      required
                    />
                  </label>
                  <label className="logo-upload-label">
                    Logo
                    <div className="logo-upload-box">
                      {empresa.logoPreview ? (
                        <div className="logo-preview-wrap">
                          <img src={empresa.logoPreview} alt="Vista previa del logo" />
                          <button type="button" className="btn-ghost btn-sm" onClick={removeLogo}>
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <p className="logo-hint">PNG o JPG, máx. 2 MB</p>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        onChange={handleLogoChange}
                      />
                    </div>
                  </label>
                </div>
                <div className="wizard-actions">
                  <Link to="/login" className="btn-ghost">
                    Cancelar
                  </Link>
                  <button type="submit" className="btn-primary">
                    Siguiente →
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="wizard-form">
                <h2>Usuario y contacto</h2>
                <div className="wizard-fields-grid">
                  <label>
                    Nombre completo *
                    <input
                      type="text"
                      value={cuenta.nombre}
                      onChange={(e) => setCuenta({ ...cuenta, nombre: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Email (inicio de sesión) *
                    <input
                      type="email"
                      value={cuenta.email}
                      onChange={(e) => setCuenta({ ...cuenta, email: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Contraseña (mín. 6) *
                    <input
                      type="password"
                      value={cuenta.password}
                      onChange={(e) => setCuenta({ ...cuenta, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </label>
                  <label>
                    Confirmar contraseña *
                    <input
                      type="password"
                      value={cuenta.confirm}
                      onChange={(e) => setCuenta({ ...cuenta, confirm: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Dirección
                    <input
                      type="text"
                      value={cuenta.direccion}
                      onChange={(e) => setCuenta({ ...cuenta, direccion: e.target.value })}
                      placeholder="Dirección de la empresa"
                    />
                  </label>
                  <label>
                    Teléfono
                    <input
                      type="text"
                      value={cuenta.telefono}
                      onChange={(e) => setCuenta({ ...cuenta, telefono: e.target.value })}
                    />
                  </label>
                  <label className="span-2">
                    Email de la empresa
                    <input
                      type="email"
                      value={cuenta.emisor_email}
                      onChange={(e) => setCuenta({ ...cuenta, emisor_email: e.target.value })}
                      placeholder="contacto@miempresa.com"
                    />
                  </label>
                </div>
                <div className="wizard-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setError('');
                      setStep(1);
                    }}
                  >
                    ← Atrás
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creando…' : 'Crear cuenta'}
                  </button>
                </div>
              </form>
            )}

            <p className="auth-footer">
              ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
