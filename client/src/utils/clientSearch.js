export function filterClientsByQuery(clients, query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) return clients.slice(0, limit);
  return clients
    .filter((c) => {
      const haystack = [c.nombre, c.rnc, c.email, c.telefono, c.direccion, c.notas]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, limit);
}
