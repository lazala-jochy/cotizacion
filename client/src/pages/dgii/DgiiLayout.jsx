import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/dgii/606', label: '606' },
  { to: '/dgii/607', label: '607' },
  { to: '/dgii/historial', label: 'Historial' },
];

export default function DgiiLayout() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>606 / 607</h1>
          <p className="dgii-nav-intro">
            Compras (606) y ventas (607) — elija período, <strong>Vista previa</strong> y{' '}
            <strong>Exportar TXT</strong>. Los archivos quedan en Historial.
          </p>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Formatos DGII">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `page-tab${isActive ? ' page-tab--active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
