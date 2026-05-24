'use strict';

/**
 * Observa interacções e acumula padrões estatísticos por tenant.
 *
 * Estrutura por padrão:
 *   { key, type, frequency, last_seen, domains, anchors, intent_chain }
 *
 * Sem ML, sem modelo externo — apenas contagem + correlação temporal.
 */

const flags = require('../config/sz3FeatureFlags');

// Map<tenantId, Map<patternKey, PatternRecord>>
const _store = new Map();

function _ensure(tenantId) {
  if (!_store.has(tenantId)) _store.set(tenantId, new Map());
  return _store.get(tenantId);
}

function _buildKey(type, tokens = []) {
  return `${type}::${tokens.slice(0, 4).sort().join('+')}`;
}

/**
 * Regista uma observação e incrementa o padrão correspondente.
 * @param {string} tenantId
 * @param {{ type: string, domains: string[], anchors: string[], intent: string }} obs
 */
function observe(tenantId, obs = {}) {
  if (!flags.isPatternsEnabled() || !tenantId) return;
  const map = _ensure(tenantId);
  const anchors = (obs.anchors || []).slice(0, 6);
  const domains = (obs.domains || []).slice(0, 4);
  const key = _buildKey(obs.type || 'generic', [...anchors, ...domains]);

  const existing = map.get(key) || {
    key,
    type: obs.type || 'generic',
    frequency: 0,
    first_seen: Date.now(),
    last_seen: null,
    domains: [],
    anchors: [],
    intent_chain: []
  };

  existing.frequency += 1;
  existing.last_seen = Date.now();
  if (obs.intent && !existing.intent_chain.includes(obs.intent)) {
    existing.intent_chain = [...existing.intent_chain.slice(-4), obs.intent];
  }
  existing.domains = Array.from(new Set([...existing.domains, ...domains]));
  existing.anchors = Array.from(new Set([...existing.anchors, ...anchors]));

  // cap por tenant
  if (map.size >= flags.patternMaxPerTenant() && !map.has(key)) {
    const oldest = [...map.entries()].sort((a, b) => (a[1].last_seen || 0) - (b[1].last_seen || 0))[0];
    if (oldest) map.delete(oldest[0]);
  }

  map.set(key, existing);
}

function listPatterns(tenantId, minFreq = 1) {
  const map = _ensure(tenantId);
  return [...map.values()]
    .filter((p) => p.frequency >= minFreq)
    .sort((a, b) => b.frequency - a.frequency);
}

function topPatterns(tenantId, n = 10) {
  return listPatterns(tenantId, flags.patternMinFrequency()).slice(0, n);
}

function patternCount(tenantId) {
  return _ensure(tenantId).size;
}

function clearPatterns(tenantId) {
  _store.set(tenantId, new Map());
}

module.exports = { observe, listPatterns, topPatterns, patternCount, clearPatterns };
