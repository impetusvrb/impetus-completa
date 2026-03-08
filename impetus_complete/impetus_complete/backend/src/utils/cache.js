/**
 * CACHE EM MEMÓRIA - FASE 4
 * Cache com TTL e limite LRU para evitar crescimento indefinido de memória
 */

const entries = new Map();
const accessOrder = [];
const defaultTTL = 120000; // 2 minutos em ms
const MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES) || 1000;

function pruneCache() {
  if (entries.size <= MAX_ENTRIES) return;
  const toRemove = entries.size - MAX_ENTRIES;
  const sorted = [...entries.entries()]
    .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  for (let i = 0; i < Math.min(toRemove, sorted.length); i++) {
    entries.delete(sorted[i][0]);
    const idx = accessOrder.indexOf(sorted[i][0]);
    if (idx >= 0) accessOrder.splice(idx, 1);
  }
}

/**
 * Gera chave de cache baseada em prefixo e identificadores
 */
function makeKey(prefix, ...parts) {
  const suffix = parts.filter(Boolean).join(':');
  return suffix ? `${prefix}:${suffix}` : prefix;
}

/**
 * Obtém valor do cache. Retorna null se expirado ou inexistente.
 */
function get(key) {
  const entry = entries.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    entries.delete(key);
    const idx = accessOrder.indexOf(key);
    if (idx >= 0) accessOrder.splice(idx, 1);
    return null;
  }
  const i = accessOrder.indexOf(key);
  if (i >= 0) accessOrder.splice(i, 1);
  accessOrder.push(key);
  return entry.value;
}

/**
 * Armazena valor no cache com TTL em milissegundos
 */
function set(key, value, ttlMs = defaultTTL) {
  entries.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  const i = accessOrder.indexOf(key);
  if (i >= 0) accessOrder.splice(i, 1);
  accessOrder.push(key);
  pruneCache();
}

/**
 * Remove entrada do cache
 */
function del(key) {
  entries.delete(key);
  const idx = accessOrder.indexOf(key);
  if (idx >= 0) accessOrder.splice(idx, 1);
}

/**
 * Remove todas as entradas com determinado prefixo
 */
function delByPrefix(prefix) {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) {
      entries.delete(key);
      const idx = accessOrder.indexOf(key);
      if (idx >= 0) accessOrder.splice(idx, 1);
    }
  }
}

/**
 * Envolve função async com cache. A chave é gerada por keyFn(args).
 * @param {string} prefix - Prefixo da chave (ex: 'dashboard:summary')
 * @param {Function} fn - Função async que retorna o valor
 * @param {Function} keyFn - (args) => string - gera sufixo da chave
 * @param {number} ttlMs - TTL em milissegundos
 */
async function cached(prefix, fn, keyFn = () => '', ttlMs = defaultTTL) {
  const suffix = keyFn();
  const key = makeKey(prefix, suffix);
  const cached = get(key);
  if (cached !== null) return cached;
  const value = await fn();
  set(key, value, ttlMs);
  return value;
}

/**
 * TTLs por tipo de dado (ms)
 */
const TTL = {
  DASHBOARD_SUMMARY: 2 * 60 * 1000,   // 2 min
  DASHBOARD_TREND: 5 * 60 * 1000,     // 5 min
  DASHBOARD_INSIGHTS: 1 * 60 * 1000,  // 1 min (mais dinâmico)
  DASHBOARD_INTERACTIONS: 60 * 1000,  // 1 min
  DASHBOARD_POINTS: 5 * 60 * 1000,   // 5 min
};

function getStats() {
  return { size: entries.size, maxEntries: MAX_ENTRIES };
}

module.exports = {
  get,
  set,
  del,
  delByPrefix,
  cached,
  makeKey,
  getStats,
  TTL,
  defaultTTL
};
