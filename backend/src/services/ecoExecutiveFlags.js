'use strict';

/**
 * ECO-07 — feature flag Executive Dashboard Consumer (rollback independente de ECO-03…06).
 */

const observability = require('./observabilityService');

const FLAG_EXECUTIVE = 'ECO_EXECUTIVE_VIA_EG';
const METRIC_PREFIX = 'eco_executive_';

/** @type {{ shadow_total: number, consumer_total: number, matches: number, divergences: number, kpis_consumed: number, kpis_local: number, reuse_total: number, dashboards_migrated: number, legacy_ms: number[], governance_ms: number[] }} */
const _stats = {
  shadow_total: 0,
  consumer_total: 0,
  matches: 0,
  divergences: 0,
  kpis_consumed: 0,
  kpis_local: 0,
  reuse_total: 0,
  dashboards_migrated: 0,
  legacy_ms: [],
  governance_ms: []
};

function _isTrue(envName) {
  return String(process.env[envName] || '').toLowerCase() === 'true';
}

function isEcoExecutiveViaEg() {
  return _isTrue(FLAG_EXECUTIVE);
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
    if (observation.localKpis) {
      _stats.kpis_local += 1;
      _metric('kpis_local');
    }
    if (observation.governanceKpis) {
      _stats.kpis_consumed += 1;
      _metric('kpis_consumed');
    }
    if (observation.match === true) {
      _stats.matches += 1;
      _metric('shadow_match');
    }
    if (observation.match === false) {
      _stats.divergences += 1;
      _metric('shadow_divergence');
    }
    if (observation.dashboardId) {
      _stats.dashboards_migrated += 1;
      _metric('dashboards_observed');
    }
  } else if (mode === 'consumer') {
    _stats.consumer_total += 1;
    _metric('consumer_total');
    if (durationMs > 0) _stats.governance_ms.push(durationMs);
    if (observation.reused === true) {
      _stats.reuse_total += 1;
      _metric('insights_reused');
    }
    if (observation.kpiCount > 0) {
      _stats.kpis_consumed += observation.kpiCount;
      _metric('kpis_consumed', observation.kpiCount);
    }
    if (observation.dashboardId) {
      _stats.dashboards_migrated += 1;
      _metric('dashboards_migrated');
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
    flag: FLAG_EXECUTIVE,
    enabled: isEcoExecutiveViaEg(),
    shadow_mode: !isEcoExecutiveViaEg(),
    shadow_total: _stats.shadow_total,
    consumer_total: _stats.consumer_total,
    matches: _stats.matches,
    divergences: _stats.divergences,
    kpis_consumed: _stats.kpis_consumed,
    kpis_local: _stats.kpis_local,
    insights_reused: _stats.reuse_total,
    dashboards_migrated: _stats.dashboards_migrated,
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
  _stats.kpis_consumed = 0;
  _stats.kpis_local = 0;
  _stats.reuse_total = 0;
  _stats.dashboards_migrated = 0;
  _stats.legacy_ms = [];
  _stats.governance_ms = [];
}

module.exports = {
  FLAG_EXECUTIVE,
  isEcoExecutiveViaEg,
  recordObservation,
  getAuditStatus,
  resetStatsForTests
};
