'use strict';

/**
 * Reduz escritas repetidas de last_activity / last_seen durante rajadas de requisições.
 * Mantém auditoria: no máximo 1 touch por sessão a cada THROTTLE_MS.
 */
const db = require('../db');

const THROTTLE_MS = parseInt(process.env.SESSION_ACTIVITY_THROTTLE_MS, 10) || 60_000;
const lastTouchBySession = new Map();
const MAX_ENTRIES = 10_000;

function pruneMap() {
  if (lastTouchBySession.size <= MAX_ENTRIES) return;
  const cutoff = Date.now() - THROTTLE_MS * 2;
  for (const [k, v] of lastTouchBySession) {
    if (v < cutoff) lastTouchBySession.delete(k);
  }
}

function shouldThrottle(sessionId) {
  const key = String(sessionId);
  const now = Date.now();
  const last = lastTouchBySession.get(key);
  if (last != null && now - last < THROTTLE_MS) return true;
  lastTouchBySession.set(key, now);
  pruneMap();
  return false;
}

/**
 * Atualiza last_activity e last_seen sem bloquear a resposta HTTP.
 * @param {string|number} sessionId
 * @param {string|number} userId
 */
function touchSessionActivityAsync(sessionId, userId) {
  if (!sessionId || !userId) return;
  if (shouldThrottle(sessionId)) return;

  Promise.all([
    db.query('UPDATE sessions SET last_activity = now() WHERE id = $1', [sessionId]),
    db.query('UPDATE users SET last_seen = now() WHERE id = $1', [userId])
  ]).catch((err) => {
    console.warn('[SESSION_ACTIVITY_TOUCH]', err?.message || err);
  });
}

module.exports = {
  touchSessionActivityAsync,
  THROTTLE_MS
};
