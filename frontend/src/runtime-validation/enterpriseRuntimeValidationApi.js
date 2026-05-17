import { API_URL } from '../services/api.js';

function baseUrl() {
  return `${API_URL.replace(/\/+$/, '')}/enterprise-runtime-validation`;
}

export async function fetchEnterpriseValidationPack(body = {}) {
  try {
    const token = localStorage.getItem('impetus_token');
    if (!token) return null;
    const res = await fetch(`${baseUrl()}/pack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchEnterpriseRuntimeSnapshot() {
  try {
    const token = localStorage.getItem('impetus_token');
    if (!token) return null;
    const res = await fetch(`${baseUrl()}/runtime/snapshot`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
