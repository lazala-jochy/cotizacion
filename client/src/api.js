// Misma origen en prod (Express sirve dist + API en :3847)
const API_BASE = '';

let refreshInFlight = null;

function getToken() {
  return localStorage.getItem('token');
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

export function setAuthTokens({ accessToken, refreshToken, token }) {
  const access = accessToken || token;
  if (access) localStorage.setItem('token', access);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  window.dispatchEvent(
    new CustomEvent('auth:tokens-refreshed', {
      detail: { accessToken: access, refreshToken, token: access },
    })
  );
}

export function clearAuthTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'refresh failed');
        setAuthTokens(data);
        return true;
      })
      .catch(() => {
        clearAuthTokens();
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

async function request(path, options = {}, allowRetry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const raw = await res.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: raw.trim() || `Error ${res.status}` };
    }
  }

  const skipRefreshOn401 = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/recover-password',
  ]);
  if (
    res.status === 401 &&
    allowRetry &&
    !skipRefreshOn401.has(path) &&
    getRefreshToken() &&
    !options._retried
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, { ...options, _retried: true }, false);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Error en la solicitud (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  license: {
    status: () => request('/api/license/status'),
    modules: () => request('/api/license/modules'),
    activate: (productKey) =>
      request('/api/license/activate', {
        method: 'POST',
        body: JSON.stringify({ productKey }),
      }),
    refresh: () => request('/api/license/refresh', { method: 'POST' }),
    syncScheduled: () => request('/api/license/sync-scheduled', { method: 'POST' }),
    syncLog: () => request('/api/license/sync-log'),
    deactivate: () => request('/api/license/deactivate', { method: 'POST' }),
  },
  emisor: {
    get: () => request('/api/emisor'),
    update: (body) => request('/api/emisor', { method: 'PUT', body: JSON.stringify(body) }),
  },
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  refresh: (body) => request('/api/auth/refresh', { method: 'POST', body: JSON.stringify(body) }),
  logout: (body) => request('/api/auth/logout', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  recoverPassword: (body) =>
    request('/api/auth/recover-password', { method: 'POST', body: JSON.stringify(body) }),
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
  expenses: {
    meta: () => request('/api/expenses/meta'),
    dashboard: () => request('/api/expenses/dashboard'),
    categories: () => request('/api/expenses/categories'),
    createCategory: (body) =>
      request('/api/expenses/categories', { method: 'POST', body: JSON.stringify(body) }),
    updateCategory: (id, body) =>
      request(`/api/expenses/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteCategory: (id) => request(`/api/expenses/categories/${id}`, { method: 'DELETE' }),
    list: (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') q.set(k, v);
      });
      const qs = q.toString();
      return request(`/api/expenses${qs ? `?${qs}` : ''}`);
    },
    get: (id) => request(`/api/expenses/${id}`),
    create: (body) => request('/api/expenses', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id) => request(`/api/expenses/${id}`, { method: 'DELETE' }),
    reportSummary: (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') q.set(k, v);
      });
      return request(`/api/expenses/reports/summary?${q}`);
    },
    incomeStatement: (params) => {
      const q = new URLSearchParams(params);
      return request(`/api/expenses/reports/income-statement?${q}`);
    },
    exportReport: async (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') q.set(k, v);
      });
      const format = params.format || 'csv';
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/expenses/reports/export?${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al exportar');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gastos-${Date.now()}.${format === 'pdf' ? 'html' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    projects: () => request('/api/expenses/projects'),
    createProject: (body) =>
      request('/api/expenses/projects', { method: 'POST', body: JSON.stringify(body) }),
  },
  finance: {
    quoteProfitability: (quoteId) => request(`/api/finance/quotes/${quoteId}/profitability`),
    invoiceProfitability: (invoiceId) => request(`/api/finance/invoices/${invoiceId}/profitability`),
  },
  dgii: {
    catalogs: () => request('/api/dgii/catalogs'),
    listReports: (params = {}) => {
      const q = new URLSearchParams();
      if (params.report_type) q.set('report_type', params.report_type);
      const qs = q.toString();
      return request(`/api/dgii/reports${qs ? `?${qs}` : ''}`);
    },
    downloadReport: async (id, filename) => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/dgii/reports/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al descargar');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `dgii-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    },
    preview607: (period) => request(`/api/dgii/607/preview?period=${encodeURIComponent(period)}`),
    export607: (period) =>
      request('/api/dgii/607/export', { method: 'POST', body: JSON.stringify({ period }) }),
    preview608: (period) => request(`/api/dgii/608/preview?period=${encodeURIComponent(period)}`),
    export608: (period) =>
      request('/api/dgii/608/export', { method: 'POST', body: JSON.stringify({ period }) }),
    preview606: (period) => request(`/api/dgii/606/preview?period=${encodeURIComponent(period)}`),
    export606: (period) =>
      request('/api/dgii/606/export', { method: 'POST', body: JSON.stringify({ period }) }),
    listPurchases: (period) =>
      request(`/api/dgii/606/purchases?period=${encodeURIComponent(period)}`),
    createPurchase: (body) =>
      request('/api/dgii/606/purchases', { method: 'POST', body: JSON.stringify(body) }),
    deletePurchase: (id) => request(`/api/dgii/606/purchases/${id}`, { method: 'DELETE' }),
    listSuppliers: () => request('/api/dgii/606/suppliers'),
    createSupplier: (body) =>
      request('/api/dgii/606/suppliers', { method: 'POST', body: JSON.stringify(body) }),
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
  report_builder: {
    analyze: (body) =>
      request('/api/report-builder/analyze', { method: 'POST', body: JSON.stringify(body) }),
    run: (body) =>
      request('/api/report-builder/run', { method: 'POST', body: JSON.stringify(body) }),
    exportBlob: async (body) => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/report-builder/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al exportar');
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return res.json();
      }
      return res.blob();
    },
  },
};
