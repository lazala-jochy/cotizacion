import { useState } from 'react';
import { useLicense } from '../context/LicenseContext';
import { APP_MODULES } from '../licensing/modules';
import { formatProductKeyInput } from '../utils/productKeyFormat';
import LicenseContactNote from './LicenseContactNote';
import LicenseLoadingScreen from './LicenseLoadingScreen';

function moduleLabel(code) {
  return APP_MODULES.find((m) => m.code === code)?.name || code;
}

export default function LicenseSettingsSection() {
  const { license, loading, activate, refreshModules, deactivate, syncing } = useLicense();
  const [productKey, setProductKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);

  const hasStoredKey = Boolean(license?.productKey);
  const showActivateForm = !hasStoredKey || showChangeForm;

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await activate(productKey.trim());
      setProductKey('');
      setShowChangeForm(false);
      setSuccess('Licencia activada correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo activar la licencia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateModules = async () => {
    setError('');
    setSuccess('');
    try {
      await refreshModules();
      setSuccess('Módulos actualizados correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudieron actualizar los módulos');
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('¿Quitar la licencia de este equipo? Deberá ingresar el product key de nuevo.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await deactivate();
      setProductKey('');
      setShowChangeForm(false);
      setSuccess('Licencia eliminada de este equipo.');
    } catch (err) {
      setError(err.message || 'No se pudo quitar la licencia');
    }
  };

  if (loading) {
    return (
      <section className="panel license-panel-loading" id="licencia">
        <LicenseLoadingScreen message="Cargando información de licencia…" />
      </section>
    );
  }

  return (
    <section className="panel" id="licencia">
      <div className="panel-header-row">
        <div>
          <h2>Licencia / Product key</h2>
          <p className="muted">
            Ingrese el product key de Lazala Innovaciones para habilitar los módulos de la aplicación.
          </p>
          <LicenseContactNote className="muted license-contact-note" />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {hasStoredKey && (
        <div className="license-status-card">
          <dl className="license-status-grid">
            <div>
              <dt>Estado</dt>
              <dd>
                <span className="license-badge license-badge--active">Activa</span>
              </dd>
            </div>
            {license.customerName && (
              <div>
                <dt>Cliente</dt>
                <dd>{license.customerName}</dd>
              </div>
            )}
            <div>
              <dt>Product key</dt>
              <dd className="license-key-mono">{license.productKey}</dd>
            </div>
            {license.expiresAt && (
              <div>
                <dt>Expira</dt>
                <dd>{new Date(license.expiresAt).toLocaleDateString('es-DO')}</dd>
              </div>
            )}
          </dl>

          {license.modules?.length > 0 && (
            <div className="license-modules-list">
              <p className="muted">Módulos de esta licencia:</p>
              <div className="license-module-chips">
                {license.modules.map((code) => (
                  <span key={code} className="license-module-chip">
                    {moduleLabel(code)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="license-sync-actions">
            <div className="license-action-buttons">
              <button
                type="button"
                className="btn-primary"
                onClick={handleUpdateModules}
                disabled={syncing}
              >
                {syncing ? 'Actualizando módulos…' : 'Actualizar módulos'}
              </button>
              {!showChangeForm && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setProductKey('');
                    setShowChangeForm(true);
                  }}
                >
                  Cambiar licencia
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={handleDeactivate}>
                Quitar licencia
              </button>
            </div>
          </div>

          {license.stale && license.error && (
            <p className="alert alert-error">{license.error} (usando caché local)</p>
          )}
        </div>
      )}

      {showActivateForm && (
        <form onSubmit={handleActivate} className="license-form">
          <label>
            {hasStoredKey ? 'Nueva product key' : 'Product key'}
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
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Guardando…' : hasStoredKey ? 'Actualizar licencia' : 'Activar licencia'}
            </button>
            {hasStoredKey && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowChangeForm(false);
                  setProductKey('');
                  setError('');
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
