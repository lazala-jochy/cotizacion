import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/compras/gastos', label: 'Gastos' },
  { to: '/compras/categorias', label: 'Categorías' },
  { to: '/compras/reporte', label: 'Reporte de gastos' },
  { to: '/compras/resultados', label: 'Estado de resultados' },
];

export default function FinanzasLayout() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Compras</h1>
          <p>Gastos, categorías y estado de resultados</p>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Compras">
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
