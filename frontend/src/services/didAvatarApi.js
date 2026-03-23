/**
 * Cliente para /api/did — vídeo talking-head (D-ID) via backend.
 *
 * Em cada resposta de voz (TTS ou Realtime), `createDidTalk` envia sempre `source_url`:
 * a face estática que a D-ID anima. Por defeito é a imagem em `public/impetus-did-source.jpg`
 * servida em `https://<site>/impetus-did-source.jpg`, ou `VITE_DID_SOURCE_URL` se definido.
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** Nome do ficheiro em `public/` usado como rosto D-ID quando não há VITE_DID_SOURCE_URL. */
export const DID_AVATAR_DEFAULT_FILE = 'impetus-did-source.jpg';

export function isDidAvatarEnabled() {
  const v = String(import.meta.env.VITE_DID_AVATAR_ENABLED ?? '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * Imagem estática que a D-ID anima (face frontal, bem iluminada).
 * Prioridade: VITE_DID_SOURCE_URL; senão mesma origem + ficheiro em public/ (ver DID_AVATAR_DEFAULT_FILE).
 * A URL tem de ser alcançável pela internet pela API D-ID (localhost não serve em produção na nuvem).
 */
export function didAvatarSourceUrl() {
  const env = String(import.meta.env.VITE_DID_SOURCE_URL ?? '').trim();
  if (env) return env;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/${DID_AVATAR_DEFAULT_FILE}`;
  }
  return '';
}

/** D-ID ligado e URL da imagem em HTTPS (obrigatório para a D-ID ir buscar o ficheiro). */
export function isDidAvatarConfigured() {
  if (!isDidAvatarEnabled()) return false;
  const u = didAvatarSourceUrl().trim().toLowerCase();
  return u.startsWith('https://');
}

function authHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('impetus_token') : null;
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function createDidTalk(text, signal) {
  const sourceUrl = didAvatarSourceUrl();
  if (!sourceUrl.startsWith('https://')) {
    throw new Error('VITE_DID_SOURCE_URL deve ser uma URL HTTPS pública da imagem do avatar.');
  }
  const res = await fetch(`${API_BASE}/did/talks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      source_url: sourceUrl,
      text: String(text || '').trim().slice(0, 8000)
    }),
    signal
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `D-ID: HTTP ${res.status}`);
  }
  if (!data.ok || !data.id) {
    throw new Error(data.error || 'Resposta D-ID inválida');
  }
  return data.id;
}

export async function getDidTalkStatus(id, signal) {
  const res = await fetch(`${API_BASE}/did/talks/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: authHeaders(),
    signal
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `D-ID status: HTTP ${res.status}`);
  }
  return data;
}

/**
 * @param {string} id
 * @param {{ signal?: AbortSignal, maxWaitMs?: number, intervalMs?: number }} opts
 * @returns {Promise<string>} result_url
 */
export async function pollDidTalkUntilVideo(id, opts = {}) {
  const { signal, maxWaitMs = 120000, intervalMs = 2500 } = opts;
  const t0 = Date.now();
  while (Date.now() - t0 < maxWaitMs) {
    if (signal?.aborted) {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    }
    const st = await getDidTalkStatus(id, signal);
    if (st.result_url) return st.result_url;
    if (st.status === 'error' || st.status === 'rejected') {
      throw new Error(st.error || 'D-ID rejeitou ou falhou o vídeo');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Tempo esgotado aguardando vídeo D-ID');
}
