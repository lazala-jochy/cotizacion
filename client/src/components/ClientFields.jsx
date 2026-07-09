import { useEffect, useMemo, useState } from 'react';
import { filterQuoteClientSuggestions } from '../utils/quoteClientSuggestions';

export const EMPTY_CLIENT_FORM = {
  nombre: '',
  rnc: '',
  direccion: '',
  telefono: '',
  email: '',
};

/**
 * Datos del cliente en la cotización.
 * Autocompleta desde clientes registrados y cotizaciones anteriores.
 */
export default function ClientFields({ suggestions = [], value, onChange }) {
  const [search, setSearch] = useState(value.nombre || '');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setSearch(value.nombre || '');
  }, [value.nombre]);

  const filtered = useMemo(
    () => filterQuoteClientSuggestions(suggestions, search),
    [suggestions, search]
  );

  const updateField = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue });
    if (field === 'nombre') setSearch(fieldValue);
  };

  const handleSearchChange = (text) => {
    setSearch(text);
    setShowResults(true);
    onChange({ ...value, nombre: text });
  };

  const handlePick = (c) => {
    onChange({
      nombre: c.nombre || '',
      rnc: c.rnc || '',
      direccion: c.direccion || '',
      telefono: c.telefono || '',
      email: c.email || '',
    });
    setSearch(c.nombre || '');
    setShowResults(false);
  };

  return (
    <div className="client-picker">
      {suggestions.length > 0 && (
        <div className="client-search-wrap">
          <label>
            Buscar cliente (registrados o cotizaciones anteriores)
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowResults(true)}
              onBlur={() => {
                window.setTimeout(() => setShowResults(false), 150);
              }}
              placeholder="Escribe el nombre del cliente…"
              autoComplete="off"
            />
          </label>
          {showResults && search.trim() && filtered.length > 0 && (
            <ul className="client-search-results" role="listbox">
              {filtered.map((c) => (
                <li key={c.nombre}>
                  <button
                    type="button"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePick(c)}
                  >
                    <span className="client-search-name">{c.nombre}</span>
                    <span className="client-search-meta">
                      {[c.rnc && `RNC ${c.rnc}`, c.telefono, c.email].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showResults && search.trim() && filtered.length === 0 && (
            <p className="client-search-empty muted">
              Sin coincidencias. Completa los datos del cliente abajo.
            </p>
          )}
        </div>
      )}

      <div className="form-grid">
        <label>
          Nombre *
          <input
            value={value.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            required
          />
        </label>
        <label>
          RNC
          <input value={value.rnc} onChange={(e) => updateField('rnc', e.target.value)} />
        </label>
        <label className="span-2">
          Dirección
          <input
            value={value.direccion}
            onChange={(e) => updateField('direccion', e.target.value)}
          />
        </label>
        <label>
          Teléfono
          <input value={value.telefono} onChange={(e) => updateField('telefono', e.target.value)} />
        </label>
        <label>
          Email
          <input
            type="email"
            value={value.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
