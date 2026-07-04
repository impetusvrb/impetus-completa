'use strict';

/**
 * ECO-06 — feature flag Conversation Context KB Consumer (rollback independente de ECO-03/04/05).
 */

const observability = require('./observabilityService');

const FLAG_CONTEXT = 'ECO_CONTEXT_VIA_EG';
const METRIC_PREFIX = 'eco_context_';

/** @type {{ shadow_total: number, consumer_total: number, matches: number, divergences: number, local_queries: number, kb_queries: number, reuse_total: number, duplicates_eliminated: number, legacy_ms: number[], governance_ms: number[] }} */
const _stats = {
  shadow_total: 0,
  consumer_total: 0,
  matches: 0,
  divergences: 0,
  local_queries: 0,
  kb_queries: 0,
  reuse_total: 0,
  duplicates_eliminated: 0,
  legacy_ms: [],
  governance_ms: []
};

function _isTrue(envName) {
  return String(process.env[envName] || '').toLowerCase() === 'true';
}

function isEcoContextViaEg() {
  return _isTrue(FLAG_CONTEXT);
}

function _metric(name, delta = 1) {
  observability.incrementMetric(`${METRIC_PREFIX}${name}`, delta);
}

function recordObservation(observation = {}) {
  const mode = observation.mode || 'unknown';
  const durationMs = Number(observation.durationMs) || 0;

  if (mode === 'shadow') {
    _stats.shadow_total += 1;
    _metric('shadow_total');
    if (durationMs > 0) _stats.legacy_ms.push(durationMs);
    if (observation.localQuery) {
      _stats.local_queries += 1;
      _metric('local_queries');
    }
    if (observation.kbQuery) {
      _stats.kb_queries += 1;
      _metric('kb_queries');
    }
    if (observation.match === true) {
      _stats.matches += 1;
      _metric('shadow_match');
    }
    if (observation.match === false) {
      _stats.divergences += 1;
      _metric('shadow_divergence');
    }
    if (observation.duplicatesEliminated > 0) {
      _stats.duplicates_eliminated += observation.duplicatesEliminated;
      _metric('duplicates_eliminated', observation.duplicatesEliminated);
    }
  } else if (mode === 'consumer') {
    _stats.consumer_total += 1;
    _metric('consumer_total');
    if (durationMs > 0) _stats.governance_ms.push(durationMs);
    if (observation.kbQuery) {
      _stats.kb_queries += 1;
      _metric('kb_queries');
    }
    if (observation.reused === true) {
      _stats.reuse_total += 1;
      _metric('knowledge_reused');
    }
    if (observation.duplicatesEliminated > 0) {
      _stats.duplicates_eliminated += observation.duplicatesEliminated;
      _metric('duplicates_eliminated', observation.duplicatesEliminated);
    }
  }
}

function _avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    flag: FLAG_CONTEXT,
    enabled: isEcoContextViaEg(),
    shadow_mode: !isEcoContextViaEg(),
    shadow_total: _stats.shadow_total,
    consumer_total: _stats.consumer_total,
    matches: _stats.matches,
    divergences: _stats.divergences,
    local_queries: _stats.local_queries,
    kb_queries: _stats.kb_queries,
    knowledge_reused: _stats.reuse_total,
    duplicates_eliminated: _stats.duplicates_eliminated,
    avg_legacy_ms: _avg(_stats.legacy_ms.slice(-100)),
    avg_governance_ms: _avg(_stats.governance_ms.slice(-100)),
    metrics: Object.fromEntries(
      Object.entries(metrics).filter(([k]) => k.startsWith(METRIC_PREFIX))
    )
  };
}

function resetStatsForTests() {
  _stats.shadow_total = 0;
  _stats.consumer_total = 0;
  _stats.matches = 0;
  _stats.divergences = 0;
  _stats.local_queries = 0;
  _stats.kb_queries = 0;
  _stats.reuse_total = 0;
  _stats.duplicates_eliminated = 0;
  _stats.legacy_ms = [];
  _stats.governance_ms = [];
}

module.exports = {
  FLAG_CONTEXT,
  isEcoContextViaEg,
  recordObservation,
  getAuditStatus,
  resetStatsForTests
};
