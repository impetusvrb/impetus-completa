import { API_URL } from '../../../services/api.js';

function publicationUrl() {
  return `${API_URL.replace(/\/+$/, '')}/safety-navigation/context`;
}

let _cached = null;
let _cachedAt = 0;
const TTL_MS = 45000;

export async function fetchSafetyPublicationContext() {
  const now = Date.now();
  if (_cached && now - _cachedAt < TTL_MS) return _cached;
  try {
    const token = localStorage.getItem('impetus_token');
    if (!token) return null;
    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    const res = await fetch(publicationUrl(), { headers, credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    _cached = data;
    _cachedAt = now;
    return data;
  } catch {
    return null;
  }
}

export function invalidateSafetyPublicationCache() {
  _cached = null;
  _cachedAt = 0;
}
