import { API_URL } from '../../../services/api.js';

export async function fetchOperationalValidationPack(body = {}) {
  try {
    const token = localStorage.getItem('impetus_token');
    if (!token) return null;
    const res = await fetch(`${API_URL.replace(/\/+$/, '')}/safety-operational-validation/pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
