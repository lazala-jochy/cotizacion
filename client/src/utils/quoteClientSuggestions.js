import { filterClientsByQuery } from './clientSearch';

/** Clientes únicos tomados de cotizaciones anteriores (mismo nombre). */
export function buildQuoteClientSuggestions(quotes) {
  const seen = new Map();
  for (const q of quotes) {
    const nombre = (q.client_nombre || '').trim();
    if (!nombre) continue;
    const key = nombre.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      nombre,
      rnc: q.client_rnc || '',
      direccion: q.client_direccion || '',
      telefono: q.client_telefono || '',
      email: q.client_email || '',
    });
  }
  return [...seen.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
}

export function filterQuoteClientSuggestions(suggestions, query, limit = 12) {
  return filterClientsByQuery(suggestions, query, limit);
}
