const _routeOpenAt = new Map();

export function markLogisticsRouteOpen(pathname) {
  _routeOpenAt.set(String(pathname || '/'), Date.now());
}

export async function recordLogisticsBehaviorEvent(evt) {
  try {
    const token = localStorage.getItem('impetus_token');
    if (!token) return { ok: false };
    const { API_URL } = await import('../../../services/api.js');
    const res = await fetch(`${API_URL.replace(/\/+$/, '')}/logistics-operational-validation/behavior/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify(evt)
    });
    return res.ok ? res.json() : { ok: false, status: res.status };
  } catch {
    return { ok: false };
  }
}
