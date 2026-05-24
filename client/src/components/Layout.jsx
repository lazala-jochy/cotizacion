import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [updateMsg, setUpdateMsg] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    return window.electronAPI.onUpdateStatus((data) => setUpdateMsg(data.message));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setUpdateMsg('Actualizaciones automáticas disponibles en la app instalada.');
      return;
    }
    setUpdateMsg('Buscando actualizaciones…');
    const r = await window.electronAPI.checkForUpdates();
    setUpdateMsg(r.message || 'Listo.');
  };

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
          <button type="button" className="btn-ghost btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        {updateMsg && <div className="update-banner">{updateMsg}</div>}
        <Outlet />
      </main>
    </div>
  );
}
