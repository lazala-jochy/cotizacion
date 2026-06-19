import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLicense } from '../context/LicenseContext';
import { usePersistedBoolean } from '../hooks/usePersistedBoolean';
import { api } from '../api';
import { NAV_ITEMS } from '../licensing/modules';
import { APP_NAME } from '../constants/appBrand';

const idleUpdate = { status: 'idle', message: '' };

export default function Layout() {
  const { user, logout } = useAuth();
  const { hasModule, canAccessPath, loading: licenseLoading, licenseNotice } = useLicense();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (licenseLoading) return;
    if (!canAccessPath(location.pathname)) {
      navigate('/configuracion#licencia', { replace: true });
    }
  }, [licenseLoading, location.pathname, canAccessPath, navigate]);
  const [updateStatus, setUpdateStatus] = useState(idleUpdate);
  const [appVersion, setAppVersion] = useState('');
  const [emisor, setEmisor] = useState(null);
  const [sidebarCollapsed, toggleSidebar] = usePersistedBoolean('sidebar-collapsed', false);

  useEffect(() => {
    api.emisor.get().then(setEmisor).catch(() => setEmisor(null));
  }, [location.pathname]);

  useEffect(() => {
    const loadVersion = async () => {
      if (window.electronAPI?.getAppVersion) {
        try {
          const v = await window.electronAPI.getAppVersion();
          if (v) {
            setAppVersion(v);
            return;
          }
        } catch {
          /* fallback */
        }
      }
      api.health()
        .then((r) => setAppVersion(r.version || ''))
        .catch(() => {});
    };
    loadVersion();
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const checkUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      applyUpdateStatus(idleUpdate);
      return;
    }
    applyUpdateStatus({ status: 'checking', message: 'Buscando…', percent: 0, canRetry: false });
    const r = await window.electronAPI.checkForUpdates();
    applyUpdateStatus(r);
  };

  const installUpdate = async () => {
    if (!window.electronAPI?.quitAndInstall) return;
    applyUpdateStatus({
      status: 'installing',
      message: 'Cerrando e instalando… (10–20 s)',
      percent: 100,
    });
    await window.electronAPI.quitAndInstall();
  };

  const retryUpdate = async () => {
    await window.electronAPI?.clearUpdateCache?.().catch(() => {});
    await checkUpdates();
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

  const companyName = emisor?.nombre?.trim() || 'Mi empresa';
  const brandInitial = companyName.charAt(0).toUpperCase() || 'E';
  const brandSubtitle = emisor?.email?.trim() || emisor?.rnc?.trim() || APP_NAME;

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
      <aside className={`sidebar${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            {emisor?.logo ?
              <img src={emisor.logo} alt="" className="brand-logo" />
            : sidebarCollapsed ?
              <img src="/lazala-logo.png" alt="" className="brand-logo brand-logo--lazala" />
            : <span className="brand-mark" aria-hidden="true">
                {brandInitial}
              </span>
            }
            {!sidebarCollapsed && (
              <div className="brand-text">
                <strong className="brand-name" title={companyName}>
                  {companyName}
                </strong>
                <small className="brand-meta" title={brandSubtitle}>
                  {brandSubtitle}
                </small>
                {appVersion && <small className="brand-version">v{appVersion}</small>}
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        <nav>
          {NAV_ITEMS.filter((item) => !item.module || hasModule(item.module)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
            >
              <span className="sidebar-nav-short" aria-hidden="true">
                {item.shortLabel}
              </span>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!sidebarCollapsed && <p className="user-name">{user?.nombre}</p>}

          <div className="sidebar-updates">
            {!sidebarCollapsed && updateStatus.message && updateStatus.status !== 'idle' && (
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

            {!sidebarCollapsed && showProgress && typeof percent === 'number' && percent > 0 && (
              <span className="update-percent">{percent}%</span>
            )}
          </div>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={checkUpdates}
            title="Buscar actualizaciones"
          >
            {sidebarCollapsed ? '↻' : 'Buscar actualizaciones'}
          </button>

          {canInstall && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={installUpdate}
              title="Reiniciar e instalar"
            >
              {sidebarCollapsed ? '⬇' : 'Reiniciar e instalar'}
            </button>
          )}

          {canRetry && !canInstall && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={retryUpdate}
              title="Reintentar descarga"
            >
              {sidebarCollapsed ? '↻' : 'Reintentar descarga'}
            </button>
          )}

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            {sidebarCollapsed ? '⎋' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>
      <main className="main-content">
        {licenseNotice && (
          <div className="license-notice-banner alert alert-error" role="alert">
            {licenseNotice}{' '}
            <Link to="/configuracion#licencia">Renovar licencia</Link>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
