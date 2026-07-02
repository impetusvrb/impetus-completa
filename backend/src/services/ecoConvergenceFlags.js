'use strict';

/**
 * ECO-03 — feature flags de convergência controlada (bypasses P0/P1).
 * Cada flag inicia OFF; activação e rollback independentes por fluxo.
 */

const observability = require('./observabilityService');

const FLAG_OAE = 'ECO_OAE_VIA_EG';
const FLAG_CHAT = 'ECO_CHAT_VIA_EG';
const FLAG_ORG_AI = 'ECO_ORG_AI_VIA_EG';

const METRIC_PREFIX = 'eco_convergence_';

/** @type {Record<string, { legacy_ms: number[], governance_ms: number[], shadow_total: number, migrated_total: number }>} */
const _flowStats = {
  oae: { legacy_ms: [], governance_ms: [], shadow_total: 0, migrated_total: 0 },
  chat: { legacy_ms: [], governance_ms: [], shadow_total: 0, migrated_total: 0 },
  org_ai: { legacy_ms: [], governance_ms: [], shadow_total: 0, migrated_total: 0 }
};

function _isTrue(envName) {
  return String(process.env[envName] || '').toLowerCase() === 'true';
}

function isEcoOaeViaEg() {
  return _isTrue(FLAG_OAE);
}

function isEcoChatViaEg() {
  return _isTrue(FLAG_CHAT);
}

function isEcoOrgAiViaEg() {
  return _isTrue(FLAG_ORG_AI);
}

/**
 * @param {'oae'|'chat'|'org_ai'} flow
 */
function isFlowMigrated(flow) {
  if (flow === 'oae') return isEcoOaeViaEg();
  if (flow === 'chat') return isEcoChatViaEg();
  if (flow === 'org_ai') return isEcoOrgAiViaEg();
  return false;
}

function _metric(name, delta = 1) {
  observability.incrementMetric(`${METRIC_PREFIX}${name}`, delta);
}

/**
 * @param {'oae'|'chat'|'org_ai'} flow
 * @param {object} observation
 */
function recordObservation(flow, observation = {}) {
  const bucket = _flowStats[flow] || _flowStats.oae;
  const mode = observation.mode || 'unknown';
  const durationMs = Number(observation.durationMs) || 0;

  if (mode === 'shadow') {
    bucket.shadow_total += 1;
    if (durationMs > 0) bucket.legacy_ms.push(durationMs);
    _metric(`${flow}_shadow_total`);
    if (observation.match === true) _metric(`${flow}_shadow_match`);
    if (observation.match === false) _metric(`${flow}_shadow_divergence`);
  } else if (mode === 'governance') {
    bucket.migrated_total += 1;
    if (durationMs > 0) bucket.governance_ms.push(durationMs);
    _metric(`${flow}_migrated_total`);
    if (observation.success === true) _metric(`${flow}_governance_success`);
    if (observation.success === false) _metric(`${flow}_governance_failure`);
  }

  if (observation.policyId) {
    _metric(`${flow}_policy_${String(observation.policyId).toLowerCase()}`);
  }
}

function _avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const flows = {};

  for (const [flow, stats] of Object.entries(_flowStats)) {
    flows[flow] = {
      migrated: isFlowMigrated(flow),
      shadow_mode: !isFlowMigrated(flow),
      shadow_total: stats.shadow_total,
      migrated_total: stats.migrated_total,
      avg_legacy_ms: _avg(stats.legacy_ms.slice(-100)),
      avg_governance_ms: _avg(stats.governance_ms.slice(-100))
    };
  }

  return {
    flags: {
      [FLAG_OAE]: isEcoOaeViaEg(),
      [FLAG_CHAT]: isEcoChatViaEg(),
      [FLAG_ORG_AI]: isEcoOrgAiViaEg()
    },
    flows,
    metrics: Object.fromEntries(
      Object.entries(metrics).filter(([k]) => k.startsWith(METRIC_PREFIX))
    )
  };
}

function resetStatsForTests() {
  for (const key of Object.keys(_flowStats)) {
    _flowStats[key] = { legacy_ms: [], governance_ms: [], shadow_total: 0, migrated_total: 0 };
  }
}

module.exports = {
  FLAG_OAE,
  FLAG_CHAT,
  FLAG_ORG_AI,
  isEcoOaeViaEg,
  isEcoChatViaEg,
  isEcoOrgAiViaEg,
  isFlowMigrated,
  recordObservation,
  getAuditStatus,
  resetStatsForTests
};
