import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { id: 'empresa', label: 'Empresa', hash: '' },
  { id: 'firma', label: 'Firma y sello', hash: '#firma' },
  { id: 'correo', label: 'Correo', hash: '#correo' },
  { id: 'licencia', label: 'Licencia', hash: '#licencia' },
  { id: 'fiscal', label: 'Fiscal', hash: '#fiscal' },
];

function activeTabId(hash) {
  if (hash === '#firma') return 'firma';
  if (hash === '#correo') return 'correo';
  if (hash === '#licencia') return 'licencia';
  if (hash === '#fiscal') return 'fiscal';
  return 'empresa';
}

export default function SettingsNav() {
  const { pathname, hash } = useLocation();
  const current = activeTabId(hash);

  if (pathname !== '/configuracion') return null;

  return (
    <nav className="settings-nav" aria-label="Secciones de configuración">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          to={`/configuracion${tab.hash}`}
          className={`settings-nav-link${current === tab.id ? ' settings-nav-link--active' : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function settingsSectionVisible(hash, sectionId) {
  const current = activeTabId(hash);
  return current === sectionId;
}
