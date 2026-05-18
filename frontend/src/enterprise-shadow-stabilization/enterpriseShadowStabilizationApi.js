export async function fetchShadowStabilizationCycle(body = {}) {
  try {
    const token = localStorage.getItem('impetus_token');
    if (!token) return null;
    const { API_URL } = await import('../services/api.js');
    const res = await fetch(`${API_URL.replace(/\/+$/, '')}/enterprise-shadow-stabilization/cycle`, {
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
