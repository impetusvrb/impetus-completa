'use strict';

/**
 * ECO-05 — feature flag Pulse Consumer (rollback independente de ECO-03/04).
 */

const observability = require('./observabilityService');

const FLAG_PULSE = 'ECO_PULSE_VIA_EG';
const METRIC_PREFIX = 'eco_pulse_';

/** @type {{ shadow_total: number, consumer_total: number, matches: number, divergences: number, consumed_total: number, own_analytics_total: number, legacy_ms: number[], governance_ms: number[] }} */
const _stats = {
  shadow_total: 0,
  consumer_total: 0,
  matches: 0,
  divergences: 0,
  consumed_total: 0,
  own_analytics_total: 0,
  legacy_ms: [],
  governance_ms: []
};

function _isTrue(envName) {
  return String(process.env[envName] || '').toLowerCase() === 'true';
}

function isEcoPulseViaEg() {
  return _isTrue(FLAG_PULSE);
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
    if (observation.ownAnalytics) _stats.own_analytics_total += 1;
  } else if (mode === 'consumer') {
    _stats.consumer_total += 1;
    _metric('consumer_total');
    if (durationMs > 0) _stats.governance_ms.push(durationMs);
    if (observation.consumed === true) {
      _stats.consumed_total += 1;
      _metric('analytics_consumed');
    }
    if (observation.reuseRate > 0) {
      _metric('reuse_rate_pct', observation.reuseRate);
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
    flag: FLAG_PULSE,
    enabled: isEcoPulseViaEg(),
    shadow_mode: !isEcoPulseViaEg(),
    shadow_total: _stats.shadow_total,
    consumer_total: _stats.consumer_total,
    matches: _stats.matches,
    divergences: _stats.divergences,
    analytics_consumed: _stats.consumed_total,
    own_analytics_preserved: _stats.own_analytics_total,
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
  _stats.consumed_total = 0;
  _stats.own_analytics_total = 0;
  _stats.legacy_ms = [];
  _stats.governance_ms = [];
}

module.exports = {
  FLAG_PULSE,
  isEcoPulseViaEg,
  recordObservation,
  getAuditStatus,
  resetStatsForTests
};
