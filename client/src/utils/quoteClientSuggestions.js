import { filterClientsByQuery } from './clientSearch';

/** Combina clientes registrados y cotizaciones anteriores (RNC tiene prioridad al deduplicar). */
export function mergeClientSuggestions(registeredClients = [], quotes = []) {
  const byRnc = new Map();
  const byName = new Map();

  const add = (entry) => {
    const nombre = (entry.nombre || '').trim();
    if (!nombre) return;
    const rncKey = String(entry.rnc || '').replace(/\D/g, '');
    const normalized = {
      nombre,
      rnc: entry.rnc || '',
      direccion: entry.direccion || '',
      telefono: entry.telefono || '',
      email: entry.email || '',
      source: entry.source || 'quote',
    };
    if (rncKey) {
      byRnc.set(rncKey, normalized);
    }
    const nameKey = nombre.toLowerCase();
    if (!byName.has(nameKey)) {
      byName.set(nameKey, normalized);
    }
  };

  for (const c of registeredClients) {
    add({ ...c, source: 'client' });
  }
  for (const q of quotes) {
    add({
      nombre: q.client_nombre,
      rnc: q.client_rnc,
      direccion: q.client_direccion,
      telefono: q.client_telefono,
      email: q.client_email,
      source: 'quote',
    });
  }

  const merged = new Map();
  for (const entry of byRnc.values()) {
    merged.set(entry.nombre.toLowerCase(), entry);
  }
  for (const [key, entry] of byName) {
    if (!merged.has(key)) merged.set(key, entry);
  }

  return [...merged.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
}

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
