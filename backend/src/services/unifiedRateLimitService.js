'use strict';

/**
 * Rate limit em memória por utilizador + âmbito (janela deslizante).
 * Adequado a rotas operacionais de baixa frequência; não substitui rate limit global HTTP.
 */

const userWindow = new Map();

const DEFAULT_WINDOW_MS = 60000;
const DEFAULT_LIMIT = 5;
const MAX_KEYS = 6000;

function pruneMap(now, windowMs) {
  if (userWindow.size <= MAX_KEYS) return;
  const cutoff = now - windowMs * 3;
  for (const [k, arr] of userWindow) {
    const list = Array.isArray(arr) ? arr : [];
    const kept = list.filter((ts) => ts > cutoff);
    if (kept.length) userWindow.set(k, kept);
    else userWindow.delete(k);
  }
}

/**
 * @param {string} userId
 * @param {string} [scope] — ex.: operational_confirm, operational_rollback
 * @param {{ windowMs?: number, limit?: number }} [opts]
 * @returns {boolean} true se permitido; false se excedido
 */
function checkUserRateLimit(userId, scope = 'default', opts = {}) {
  const uid = userId != null ? String(userId).trim() : '';
  if (!uid) return false;

  const windowMs = Number(opts.windowMs) > 0 ? Number(opts.windowMs) : DEFAULT_WINDOW_MS;
  const limit = Number(opts.limit) > 0 ? Number(opts.limit) : DEFAULT_LIMIT;
  const key = `${uid}:${scope}`;

  const now = Date.now();
  const history = userWindow.get(key) || [];
  const filtered = history.filter((ts) => now - ts < windowMs);

  if (filtered.length >= limit) {
    return false;
  }

  filtered.push(now);
  userWindow.set(key, filtered);
  pruneMap(now, windowMs);
  return true;
}

module.exports = { checkUserRateLimit };
