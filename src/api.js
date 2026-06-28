const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4055/api';
const TOKEN_KEY = 'pawar_admin_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

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

  // Uploads
  upload: (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    return request('/admin/uploads', { method: 'POST', body: fd, isForm: true });
  },
};
