const BASE = '/api/runtime-z-sz5';

async function sz5Fetch(path, opts = {}) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(`SZ5 ${res.status}`);
  return res.json();
}

export const sz5Api = {
  health: () => sz5Fetch('/health'),
  query: (body) => sz5Fetch('/query', { method: 'POST', body: JSON.stringify(body) }),
  timeline: (threadId) => sz5Fetch(`/timeline${threadId ? `?thread_id=${threadId}` : ''}`),
  memory: (q) => sz5Fetch(`/memory${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  graph: () => sz5Fetch('/graph'),
  observability: () => sz5Fetch('/observability')
};
