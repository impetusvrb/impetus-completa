import { API_URL } from '../../../services/api.js';
import { getSupplyFeatureFlagSnapshot } from '../config/supplyFeatureFlags.js';

const BASE = `${API_URL.replace(/\/+$/, '')}/supply`;

async function foundationGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Supply API ${path} ${res.status}`);
  return res.json();
}

export const supplyApi = {
  getFlags: () => getSupplyFeatureFlagSnapshot(),
  health: () => foundationGet('/health', localStorage.getItem('impetus_token')),
  rbac: () => foundationGet('/rbac', localStorage.getItem('impetus_token')),
  meta: () => foundationGet('/v1/meta', localStorage.getItem('impetus_token'))
};

export default supplyApi;
