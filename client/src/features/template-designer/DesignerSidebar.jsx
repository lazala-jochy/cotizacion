import { ELEMENT_CATALOG } from './utils';

const CATEGORIES = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'cotizacion', label: 'Cotización' },
  { key: 'totales', label: 'Totales' },
  { key: 'otros', label: 'Otros' },
];

export default function DesignerSidebar({ onAddElement }) {
  return (
    <aside className="td-sidebar panel">
      <h3>Elementos</h3>
      <p className="muted td-sidebar-hint">Haz clic para agregar al lienzo. Luego arrastra y redimensiona.</p>
      {CATEGORIES.map((cat) => (
        <div key={cat.key} className="td-sidebar-group">
          <h4>{cat.label}</h4>
          <ul>
            {ELEMENT_CATALOG.filter((e) => e.category === cat.key).map((entry) => (
              <li key={entry.type}>
                <button
                  type="button"
                  className="td-sidebar-add"
                  onClick={() => onAddElement(entry.type)}
                >
                  + {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="td-sidebar-placeholders muted">
        <strong>Placeholders:</strong>
        <code>{'{{company_name}}'}</code>, <code>{'{{client_name}}'}</code>,{' '}
        <code>{'{{quotation_number}}'}</code>, <code>{'{{total}}'}</code>,{' '}
        <code>{'{{mensaje_pdf}}'}</code>…
      </div>
    </aside>
  );
}
