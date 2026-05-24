import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [updateStatus, setUpdateStatus] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    return window.electronAPI.onUpdateStatus((data) => setUpdateStatus(data));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setUpdateStatus({
        status: 'none',
        message: 'Actualizaciones automáticas disponibles en la app instalada.',
      });
      return;
    }
    setUpdateStatus({ status: 'checking', message: 'Buscando actualizaciones…' });
    const r = await window.electronAPI.checkForUpdates();
    setUpdateStatus(r);
  };

  const installUpdate = async () => {
    if (!window.electronAPI?.quitAndInstall) return;
    setUpdateStatus({ status: 'installing', message: 'Reiniciando para instalar…' });
    await window.electronAPI.quitAndInstall();
  };

  const updateMsg = updateStatus?.message;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <strong>Cotizaciones</strong>
            <small>Desktop</small>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/cotizaciones/nueva">Nueva cotización</NavLink>
          <NavLink to="/cotizaciones">Cotizaciones</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/configuracion">Emisor</NavLink>
        </nav>
        <div className="sidebar-footer">
          <p className="user-name">{user?.nombre}</p>
          <button type="button" className="btn-ghost btn-sm" onClick={checkUpdates}>
            Buscar actualizaciones
          </button>
          {updateStatus?.canInstall && (
            <button type="button" className="btn-primary btn-sm" onClick={installUpdate}>
              Reiniciar e instalar
            </button>
          )}
          <button type="button" className="btn-ghost btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        {updateMsg && (
          <div
            className={`update-banner ${
              updateStatus?.status === 'error' ? 'update-banner--error' : ''
            } ${updateStatus?.status === 'downloaded' ? 'update-banner--success' : ''}`}
          >
            {updateMsg}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
