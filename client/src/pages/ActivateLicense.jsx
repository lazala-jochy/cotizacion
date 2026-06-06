import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useLicense } from '../context/LicenseContext';
import { formatProductKeyInput } from '../utils/productKeyFormat';
import LicenseContactNote from '../components/LicenseContactNote';

export default function ActivateLicense() {
  const { activate, license, isLicensed, loading: licenseLoading } = useLicense();
  const navigate = useNavigate();
  const [productKey, setProductKey] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!licenseLoading && isLicensed) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await activate(productKey.trim());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo activar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Activar Lazala Cotizaciones</h1>
        <p className="muted">
          Ingrese el product key proporcionado por Lazala Innovaciones (formato LISC-XXXXX-...).
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Product key</span>
            <input
              type="text"
              value={productKey}
              onChange={(e) => setProductKey(formatProductKeyInput(e.target.value))}
              placeholder="LISC-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}
          {license?.error && !error && <p className="form-error">{license.error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting || licenseLoading}>
            {submitting ? 'Activando…' : 'Activar licencia'}
          </button>
        </form>

        <LicenseContactNote className="muted license-settings-hint" />

        <p className="muted license-settings-hint">
          <Link to="/login">Iniciar sesión</Link>
          {' · '}
          <Link to="/register">Crear cuenta</Link>
          {' · '}
          <Link to="/configuracion#licencia">Empresa → Licencia</Link>
        </p>
      </div>
    </div>
  );
}
