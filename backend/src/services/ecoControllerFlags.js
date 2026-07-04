'use strict';

/**
 * ECO-04 — feature flag Controller Consumer (rollback independente de ECO-03).
 */

const observability = require('./observabilityService');

const FLAG_CONTROLLER = 'ECO_CONTROLLER_VIA_EG';
const METRIC_PREFIX = 'eco_controller_';

/** @type {{ shadow_total: number, consumer_total: number, divergences: number, matches: number, parallel_total: number, consumed_total: number, legacy_ms: number[], governance_ms: number[] }} */
const _stats = {
  shadow_total: 0,
  consumer_total: 0,
  divergences: 0,
  matches: 0,
  parallel_total: 0,
  consumed_total: 0,
  legacy_ms: [],
  governance_ms: []
};

function _isTrue(envName) {
  return String(process.env[envName] || '').toLowerCase() === 'true';
}

function isEcoControllerViaEg() {
  return _isTrue(FLAG_CONTROLLER);
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
    if (observation.match === true) {
      _stats.matches += 1;
      _metric('shadow_match');
    }
    if (observation.match === false) {
      _stats.divergences += 1;
      _metric('shadow_divergence');
    }
  } else if (mode === 'consumer') {
    _stats.consumer_total += 1;
    _metric('consumer_total');
    if (durationMs > 0) _stats.governance_ms.push(durationMs);
    if (observation.consumed === true) {
      _stats.consumed_total += 1;
      _metric('decisions_consumed');
    }
    if (observation.parallel === true) {
      _stats.parallel_total += 1;
      _metric('parallel_decisions');
    }
  }

  if (observation.policyId) {
    _metric(`policy_${String(observation.policyId).toLowerCase()}`);
  }
  if (observation.latencySavedMs > 0) {
    _metric('latency_saved_ms', observation.latencySavedMs);
  }
}

function _avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    flag: FLAG_CONTROLLER,
    enabled: isEcoControllerViaEg(),
    shadow_mode: !isEcoControllerViaEg(),
    shadow_total: _stats.shadow_total,
    consumer_total: _stats.consumer_total,
    matches: _stats.matches,
    divergences: _stats.divergences,
    parallel_decisions: _stats.parallel_total,
    decisions_consumed: _stats.consumed_total,
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
  _stats.divergences = 0;
  _stats.matches = 0;
  _stats.parallel_total = 0;
  _stats.consumed_total = 0;
  _stats.legacy_ms = [];
  _stats.governance_ms = [];
}

module.exports = {
  FLAG_CONTROLLER,
  isEcoControllerViaEg,
  recordObservation,
  getAuditStatus,
  resetStatsForTests
};
