const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4055/api';
const TOKEN_KEY = 'pawar_admin_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Build a query string from non-empty params, e.g. {from,to} -> "?from=..&to=.."
function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  return entries.length ? `?${new URLSearchParams(Object.fromEntries(entries))}` : '';
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    tokenStore.clear();
    if (!path.startsWith('/auth/login')) window.location.hash = '#/login';
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),

  // Products
  listProducts: (q) => request(`/admin/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getProduct: (id) => request(`/admin/products/${id}`),
  createProduct: (data) => request('/admin/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/admin/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

  // CMS content
  listContent: () => request('/admin/content'),
  upsertContent: (key, label, data) =>
    request(`/admin/content/${key}`, { method: 'PUT', body: { label, data } }),

  // Categories
  listCategories: () => request('/admin/categories'),
  createCategory: (data) => request('/admin/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/admin/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),

  // Finance
  financeSummary: (params = {}) => request(`/admin/finance/summary${qs(params)}`),
  financeSalesTrend: (params = {}) => request(`/admin/finance/sales-trend${qs(params)}`),
  financeTopProducts: (params = {}) => request(`/admin/finance/top-products${qs(params)}`),
  financeProfit: (params = {}) => request(`/admin/finance/profit${qs(params)}`),

  // Costs (landed COGS)
  landedCogs: () => request('/admin/costs/landed'),
  listBatches: () => request('/admin/costs/batches'),
  createBatch: (data) => request('/admin/costs/batches', { method: 'POST', body: data }),
  deleteBatch: (id) => request(`/admin/costs/batches/${id}`, { method: 'DELETE' }),
  listShipments: () => request('/admin/costs/shipments'),
  createShipment: (data) => request('/admin/costs/shipments', { method: 'POST', body: data }),
  deleteShipment: (id) => request(`/admin/costs/shipments/${id}`, { method: 'DELETE' }),
  importFbaShipment: (file, cost) => {
    const fd = new FormData();
    fd.append('file', file);
    const q = cost != null && cost !== '' ? `?cost=${encodeURIComponent(cost)}` : '';
    return request(`/admin/costs/shipments/import-fba${q}`, { method: 'POST', body: fd, isForm: true });
  },
  listOverheads: () => request('/admin/costs/overheads'),
  createOverhead: (data) => request('/admin/costs/overheads', { method: 'POST', body: data }),
  deleteOverhead: (id) => request(`/admin/costs/overheads/${id}`, { method: 'DELETE' }),
  financeTransactions: (params = {}) => request(`/admin/finance/transactions${qs(params)}`),
  financeImport: (type, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/admin/finance/import?type=${type}`, { method: 'POST', body: fd, isForm: true });
  },

  // Uploads
  upload: (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    return request('/admin/uploads', { method: 'POST', body: fd, isForm: true });
  },
};
