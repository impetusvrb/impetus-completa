'use strict';

/**
 * CERT-VOICE-02 — Sessão server-side do Executive Presentation Context (por utilizador/tenant).
 * Substituí gradualmente o sessionStorage como fonte de verdade.
 */

const TTL_MS = 4 * 60 * 60 * 1000;
const _store = new Map();

function sessionKey(user = {}) {
  const cid = user.company_id || user.companyId || '0';
  const uid = user.id || user.user_id || '0';
  return `${cid}:${uid}`;
}

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of _store.entries()) {
    if (!v?.expires_at || v.expires_at < now) _store.delete(k);
  }
}

function getPresentationSession(user) {
  pruneExpired();
  const key = sessionKey(user);
  const row = _store.get(key);
  if (!row) return null;
  return row.payload || null;
}

function setPresentationSession(user, payload) {
  const key = sessionKey(user);
  _store.set(key, {
    payload: { ...payload, updated_at: new Date().toISOString() },
    expires_at: Date.now() + TTL_MS
  });
  return payload;
}

function clearPresentationSession(user) {
  _store.delete(sessionKey(user));
}

module.exports = {
  getPresentationSession,
  setPresentationSession,
  clearPresentationSession,
  sessionKey
};
