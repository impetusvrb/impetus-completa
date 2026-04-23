const BASE = '/api/impetus-admin';
/** Central de governança de IA (rotas exclusivas super_admin). */
const GOVERNANCE_BASE = '/api/admin-portal';

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

async function apiFetch(baseUrl, path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${baseUrl}${path}`, {
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

export async function api(path, options = {}) {
  return apiFetch(BASE, path, options);
}

/** Governança global de incidentes IA (ISO 42001 / auditoria). */
export async function apiGovernance(path, options = {}) {
  return apiFetch(GOVERNANCE_BASE, path, options);
}
