const BASE = '/api/impetus-admin';

function getToken() {
  try {
    return localStorage.getItem('impetus_admin_token') || '';
  } catch {
    return '';
  }
}

export function setToken(t) {
  localStorage.setItem('impetus_admin_token', t);
}

export function clearToken() {
  localStorage.removeItem('impetus_admin_token');
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || 'Erro');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
