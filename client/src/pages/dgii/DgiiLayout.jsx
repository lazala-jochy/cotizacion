import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/dgii/607', label: '607 — Ventas' },
  { to: '/dgii/608', label: '608 — Anulados' },
  { to: '/dgii/606', label: '606 — Compras' },
  { to: '/dgii/historial', label: 'Historial' },
];

export default function DgiiLayout() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>DGII</h1>
          <p className="dgii-nav-intro">
            Elija formato, período, <strong>Vista previa</strong> y <strong>Exportar TXT</strong>. Los
            archivos quedan en Historial.
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
