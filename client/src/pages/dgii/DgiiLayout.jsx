import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/dgii/607', label: 'Formato 607' },
  { to: '/dgii/608', label: 'Formato 608' },
  { to: '/dgii/606', label: 'Formato 606' },
  { to: '/dgii/historial', label: 'Historial' },
];

export default function DgiiLayout() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>DGII</h1>
          <p>Formatos fiscales 606, 607 y 608 para la Oficina Virtual</p>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Sección DGII">
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
