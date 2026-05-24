import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const idleUpdate = { status: 'idle', message: '' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [updateStatus, setUpdateStatus] = useState(idleUpdate);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    api.health()
      .then((r) => setAppVersion(r.version || ''))
      .catch(() => {});
  }, []);

  const applyUpdateStatus = useCallback((data) => {
    if (!data) return;
    setUpdateStatus((prev) => ({
      ...prev,
      ...data,
      percent:
        typeof data.percent === 'number' ? data.percent
        : data.status === 'downloaded' ? 100
        : prev.percent,
    }));
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus(applyUpdateStatus);
    return unsub;
  }, [applyUpdateStatus]);

  useEffect(() => {
    window.electronAPI?.getUpdateState?.().then(applyUpdateStatus).catch(() => {});
  }, [applyUpdateStatus]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      applyUpdateStatus({
        status: 'none',
        message: 'Solo en la app instalada.',
        canRetry: false,
      });
      return;
    }
    applyUpdateStatus({ status: 'checking', message: 'Buscando…', percent: 0, canRetry: false });
    const r = await window.electronAPI.checkForUpdates();
    applyUpdateStatus(r);
  };

  const installUpdate = async () => {
    if (!window.electronAPI?.quitAndInstall) return;
    applyUpdateStatus({ status: 'installing', message: 'Reiniciando…', percent: 100 });
    await window.electronAPI.quitAndInstall();
  };

  const showProgress =
    updateStatus.status === 'checking' ||
    updateStatus.status === 'downloading' ||
    updateStatus.status === 'installing';

  const percent =
    typeof updateStatus.percent === 'number' ? updateStatus.percent
    : showProgress ? 0
    : null;

  const canInstall = updateStatus.canInstall || updateStatus.status === 'downloaded';
  const canRetry =
    updateStatus.canRetry ||
    updateStatus.status === 'error' ||
    (updateStatus.status === 'downloading' && percent === 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <strong>Cotizaciones</strong>
            <small>Desktop</small>
            {appVersion && <small className="brand-version">v{appVersion}</small>}
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/cotizaciones/nueva" end>
            Nueva cotización
          </NavLink>
          <NavLink to="/cotizaciones" end>
            Cotizaciones
          </NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/configuracion">Emisor</NavLink>
        </nav>
        <div className="sidebar-footer">
          <p className="user-name">{user?.nombre}</p>

          <div className="sidebar-updates">
            {updateStatus.message && updateStatus.status !== 'idle' && (
              <p
                className={`update-sidebar-msg update-sidebar-msg--${updateStatus.status}`}
                title={updateStatus.message}
              >
                {updateStatus.message}
              </p>
            )}

            {showProgress && (
              <div className="update-progress-track" aria-label="Progreso de descarga">
                <div
                  className={`update-progress-fill ${
                    percent === 0 ? 'update-progress-fill--pulse' : ''
                  }`}
                  style={{ width: `${Math.max(percent ?? 0, percent === 0 ? 8 : 0)}%` }}
                />
              </div>
            )}

            {showProgress && typeof percent === 'number' && percent > 0 && (
              <span className="update-percent">{percent}%</span>
            )}
          </div>

          <button type="button" className="btn-ghost btn-sm" onClick={checkUpdates}>
            Buscar actualizaciones
          </button>

          {canInstall && (
            <button type="button" className="btn-primary btn-sm" onClick={installUpdate}>
              Reiniciar e instalar
            </button>
          )}

          {canRetry && !canInstall && (
            <button type="button" className="btn-ghost btn-sm" onClick={checkUpdates}>
              Reintentar descarga
            </button>
          )}

          <button type="button" className="btn-ghost btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
