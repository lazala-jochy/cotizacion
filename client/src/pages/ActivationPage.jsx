import { useState } from 'react';

function formatDate(value) {
  if (!value) return '—';
  try {
    const d = String(value).includes('T') ? value : `${String(value).slice(0, 10)}T12:00:00`;
    return new Date(d).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export default function ActivationPage({ activation, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pasteText, setPasteText] = useState('');

  const copyMachineId = async () => {
    try {
      await navigator.clipboard.writeText(activation.machineId || '');
      setMessage('Machine ID copiado al portapapeles.');
      setError('');
    } catch {
      setError('No se pudo copiar automáticamente. Copia el Machine ID manualmente.');
    }
  };

  const importFromFile = async () => {
    if (!window.electronAPI?.activateLicenseFromFile) {
      setError('La activación solo está disponible en la aplicación de escritorio.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await window.electronAPI.activateLicenseFromFile();
      if (!result.ok) {
        if (!result.canceled) setError(result.message || 'No se pudo importar la licencia');
        return;
      }
      setMessage('Licencia activada correctamente.');
      await onRefresh();
    } catch {
      setError('Error al importar el archivo de licencia.');
    } finally {
      setBusy(false);
    }
  };

  const activateFromPaste = async () => {
    const raw = pasteText.trim();
    if (!raw) {
      setError('Pega el contenido del archivo .lic o importa el archivo.');
      return;
    }
    if (!window.electronAPI?.activateLicenseFromText) {
      setError('La activación solo está disponible en la aplicación de escritorio.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await window.electronAPI.activateLicenseFromText(raw);
      if (!result.ok) {
        setError(result.message || 'Licencia inválida');
        return;
      }
      setPasteText('');
      setMessage('Licencia activada correctamente.');
      await onRefresh();
    } catch {
      setError('No se pudo validar la licencia.');
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
            <h1>Activación offline</h1>
            <p className="muted">
              Envía tu Machine ID al proveedor para recibir un archivo de licencia (.lic) e impórtalo aquí.
            </p>
          </div>
        </div>

        <div className="activation-grid">
          <div>
            <p className="activation-label">Machine ID de este equipo</p>
            <div className="activation-machine-id">{activation.machineId || '—'}</div>
            <button type="button" className="btn-ghost btn-sm" onClick={copyMachineId}>
              Copiar Machine ID
            </button>
          </div>

          <div>
            <p className="activation-label">Estado</p>
            <p className={activation.valid ? 'activation-ok' : 'activation-error'}>
              {activation.valid ? 'Licencia activa' : 'Sin licencia válida'}
            </p>
            <p className="muted">Expira: {formatDate(activation.expiresAt)}</p>
          </div>
        </div>

        {!activation.valid && (
          <>
            <div className="activation-actions">
              <button type="button" className="btn-primary" onClick={importFromFile} disabled={busy}>
                {busy ? 'Procesando…' : 'Importar archivo .lic'}
              </button>
            </div>

            <label className="activation-label" htmlFor="licPaste">
              O pega el contenido del archivo .lic
            </label>
            <textarea
              id="licPaste"
              className="activation-textarea"
              placeholder='{"v":1,"iv":"...","data":"...","tag":"...","signature":"..."}'
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              spellCheck={false}
            />
            <button type="button" className="btn-ghost" onClick={activateFromPaste} disabled={busy}>
              Activar desde texto
            </button>
          </>
        )}

        {activation.valid && activation.license && (
          <div className="activation-license-summary">
            <p>
              <strong>Empresa licenciada:</strong> {activation.license.company || '—'}
            </p>
            <p>
              <strong>Plan:</strong> {activation.license.plan || '—'}
            </p>
            <p>
              <strong>Expira:</strong> {formatDate(activation.expiresAt)}
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
