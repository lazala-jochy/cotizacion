// Misma origen en prod (Express sirve dist + API en :3847)
const API_BASE = '';

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
  templates: {
    list: () => request('/api/templates'),
    getDefault: () => request('/api/templates/default'),
    get: (id) => request(`/api/templates/${id}`),
    create: (body) =>
      request('/api/templates', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id) => request(`/api/templates/${id}`, { method: 'DELETE' }),
    duplicate: (id) => request(`/api/templates/${id}/duplicate`, { method: 'POST' }),
    setDefault: (id) => request(`/api/templates/${id}/set-default`, { method: 'POST' }),
    preview: (id, body = {}) =>
      request(`/api/templates/${id}/preview`, { method: 'POST', body: JSON.stringify(body) }),
  },
  fiscal: {
    documentTypes: () => request('/api/fiscal/document-types'),
    previewNextForType: (typeId) =>
      request(`/api/fiscal/document-types/${typeId}/preview-next`),
    sequences: () => request('/api/fiscal/sequences'),
    list: () => request('/api/fiscal/sequences'),
    getActive: () => request('/api/fiscal/active'),
    get: (id) => request(`/api/fiscal/sequences/${id}`),
    createSequence: (body) =>
      request('/api/fiscal/sequences', { method: 'POST', body: JSON.stringify(body) }),
    updateSequence: (id, body) =>
      request(`/api/fiscal/sequences/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    create: (body) => request('/api/fiscal/sequences', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/fiscal/sequences/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  invoices: {
    nextFiscalNumber: (fiscalDocumentTypeId) =>
      request(
        `/api/invoices/next-fiscal-number?fiscal_document_type_id=${encodeURIComponent(fiscalDocumentTypeId)}`
      ),
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.estado) q.set('estado', params.estado);
      if (params.search) q.set('search', params.search);
      if (params.fiscal_document_type_id) {
        q.set('fiscal_document_type_id', params.fiscal_document_type_id);
      }
      const qs = q.toString();
      return request(`/api/invoices${qs ? `?${qs}` : ''}`);
    },
    get: (id) => request(`/api/invoices/${id}`),
    audit: (id) => request(`/api/invoices/${id}/audit`),
    create: (body) => request('/api/invoices', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    setEstado: (id, estado) =>
      request(`/api/invoices/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      }),
    remove: (id) => request(`/api/invoices/${id}`, { method: 'DELETE' }),
    fromQuote: (quoteId, body = {}) =>
      request(`/api/invoices/from-quote/${quoteId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    annul: (id, body = {}) =>
      request(`/api/invoices/${id}/anular`, { method: 'POST', body: JSON.stringify(body) }),
    getEmailDefaults: (id) => request(`/api/invoices/${id}/email-defaults`),
    sendEmail: (id, body) =>
      request(`/api/invoices/${id}/send-email`, { method: 'POST', body: JSON.stringify(body) }),
  },
  quotes: {
    list: () => request('/api/quotes'),
    get: (id) => request(`/api/quotes/${id}`),
    nextNumber: () => request('/api/quotes/next-number'),
    create: (body) => request('/api/quotes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/quotes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id) => request(`/api/quotes/${id}`, { method: 'DELETE' }),
    setEstado: (id, estado) =>
      request(`/api/quotes/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
    addPayment: (id, body) =>
      request(`/api/quotes/${id}/payments`, { method: 'POST', body: JSON.stringify(body) }),
    removePayment: (id, paymentId) =>
      request(`/api/quotes/${id}/payments/${paymentId}`, { method: 'DELETE' }),
    getEmailDefaults: (id) => request(`/api/quotes/${id}/email-defaults`),
    sendEmail: (id, body) =>
      request(`/api/quotes/${id}/send-email`, { method: 'POST', body: JSON.stringify(body) }),
  },
};
