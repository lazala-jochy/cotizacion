const API_BASE = import.meta.env.DEV ? '' : 'http://127.0.0.1:3847';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  emisor: {
    get: () => request('/api/emisor'),
    update: (body) => request('/api/emisor', { method: 'PUT', body: JSON.stringify(body) }),
  },
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  clients: {
    list: () => request('/api/clients'),
    get: (id) => request(`/api/clients/${id}`),
    create: (body) => request('/api/clients', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id) => request(`/api/clients/${id}`, { method: 'DELETE' }),
  },
  quotes: {
    list: () => request('/api/quotes'),
    get: (id) => request(`/api/quotes/${id}`),
    nextNumber: () => request('/api/quotes/next-number'),
    create: (body) => request('/api/quotes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/quotes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id) => request(`/api/quotes/${id}`, { method: 'DELETE' }),
  },
};
