import { useMemo, useState } from 'react';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function maskKeyPreview(value) {
  const clean = String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!clean) return 'XXXX-XXXX-XXXX-XXXX';
  return clean.match(/.{1,4}/g)?.join('-') || clean;
}

export default function ActivationPage({ activation, onRefresh }) {
  const [productKey, setProductKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const features = useMemo(() => activation?.license?.features || [], [activation]);

  const handleActivate = async () => {
    const input = productKey.trim();
    if (!input) {
      setError('Ingresa tu Product Key para activar el software.');
      return;
    }
    if (!window.electronAPI?.activateProductKey) {
      setError('La activación solo está disponible en la app de escritorio.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await window.electronAPI.activateProductKey(input);
      if (!result.ok) {
        setError(result.message || 'Product Key inválido');
        return;
      }
      setProductKey('');
      setMessage('Activación completada correctamente.');
      await onRefresh();
    } catch {
      setError('No se pudo validar el Product Key.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="activation-page">
      <section className="activation-card panel">
        <div className="activation-header">
          <img src="/icon.png" alt="Cotizaciones" className="activation-logo" />
          <div>
            <h1>Activar producto</h1>
            <p className="muted">Ingresa tu Product Key para habilitar esta instalación offline.</p>
          </div>
        </div>

        <div className="activation-grid">
          <div>
            <p className="activation-label">Estado de licencia</p>
            <p className={activation.valid ? 'activation-ok' : 'activation-error'}>
              {activation.valid ? 'Activada' : 'No activada'}
            </p>
            <p className="muted">Expira: {formatDate(activation.expiresAt)}</p>
          </div>

          <div>
            <p className="activation-label">Formato</p>
            <div className="activation-machine-id">{maskKeyPreview(productKey)}</div>
            <p className="muted">Ejemplo: LZLA-9F2K-X8P1-QW7M</p>
          </div>
        </div>

        {!activation.valid && (
          <>
            <label className="activation-label" htmlFor="productKeyInput">
              Product Key
            </label>
            <input
              id="productKeyInput"
              className="activation-key-input"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={productKey}
              onChange={(e) => setProductKey(e.target.value.toUpperCase())}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="activation-actions">
              <button type="button" className="btn-primary" onClick={handleActivate} disabled={busy}>
                {busy ? 'Validando…' : 'Activar'}
              </button>
            </div>
          </>
        )}

        {activation.valid && (
          <div className="activation-license-summary">
            <p>
              <strong>Licencia:</strong> {activation.license?.licenseId || '—'}
            </p>
            <p>
              <strong>Plan:</strong> {activation.license?.plan || '—'}
            </p>
            <p>
              <strong>Funciones:</strong> {features.length ? features.join(', ') : '—'}
            </p>
            <p>
              <strong>Activada:</strong> {formatDate(activation.activatedAt?.slice?.(0, 10))}
            </p>
          </div>
        )}

        {message && <div className="alert alert-success">{message}</div>}
        {!activation.valid && activation.reason && !error && (
          <div className="alert alert-error">{activation.reason}</div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
      </section>
    </div>
  );
}
