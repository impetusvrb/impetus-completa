/**
 * Cliente — registo de comportamento operacional SST.
 */
import { API_URL } from '../../../services/api.js';
import { resolveSafetyAudienceBand } from '../navigation/safetyAudienceNavigation.js';

const _routeOpenAt = new Map();

export function markSafetyRouteOpen(pathname) {
  _routeOpenAt.set(String(pathname || '/'), Date.now());
}

export async function recordBehaviorEvent(evt) {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    user = {};
  }
  const payload = { ...evt, audience_band: evt.audience_band || resolveSafetyAudienceBand(user) };
  try {
    const token = localStorage.getItem('impetus_token');
    if (!token) return { ok: false };
    const res = await fetch(`${API_URL.replace(/\/+$/, '')}/safety-operational-validation/behavior/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    return res.ok ? res.json() : { ok: false, status: res.status };
  } catch {
    return { ok: false };
  }
}
