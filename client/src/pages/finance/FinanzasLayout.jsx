import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/finanzas/gastos', label: 'Gastos' },
  { to: '/finanzas/categorias', label: 'Categorías' },
  { to: '/finanzas/reporte', label: 'Reporte de gastos' },
  { to: '/finanzas/resultados', label: 'Estado de resultados' },
];

export default function FinanzasLayout() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Finanzas</h1>
          <p>Gastos, rentabilidad y estado de resultados</p>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Finanzas">
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
