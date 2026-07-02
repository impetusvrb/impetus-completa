'use strict';

/**
 * ECO-03 — adapter NC_BRIDGE_MIRROR → Event Governance v1.
 * Espelha envios unifiedMessaging / notification bridge sob política certificada.
 */

const observability = require('../observabilityService');
const notificationBridge = require('../notificationBridgeService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const ecoFlags = require('../ecoConvergenceFlags');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'eco_nc_bridge_mirror_events';
const METRIC_MIGRATED = 'eco_nc_bridge_mirror_migrated';
const METRIC_SHADOW_TOTAL = 'eco_nc_bridge_mirror_shadow_total';

/** @type {{ events: number, migrated: number, shadow: number }} */
const _stats = { events: 0, migrated: 0, shadow: 0 };

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function isNcBridgeMirrorMigrated() {
  return ecoFlags.isEcoOaeViaEg() || ecoFlags.isEcoChatViaEg();
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  return {
    companyId: input.companyId,
    eventType: input.eventType || 'nc_bridge_mirror',
    category: 'system',
    severity: normalizeSeverity(input.severity || 'high'),
    sourceModule: 'unifiedMessagingService',
    payload: {
      message: input.message,
      userId: input.userId,
      recipientUserId: input.userId,
      type: input.type || 'nc_bridge_mirror',
      bridgeContext: input.bridgeContext || 'operational'
    }
  };
}

function inferLegacyDistribution(input) {
  const severity = normalizeSeverity(input.severity || 'high');
  return {
    severity,
    channels: ['notification_center'],
    escalationLevel: severity === 'critical' || severity === 'high' ? 2 : 1,
    bridgeEligible: notificationBridge.isOperationalSeverityEligible(severity)
  };
}

function compareShadow(legacy, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  const decision = evaluation.decision || {};
  const govPolicy = evaluation.policyId || decision.policyId || null;
  const match = evaluation.approved === true && govPolicy === 'NC_BRIDGE_MIRROR';
  return { match, legacy, governance: { policyId: govPolicy, approved: evaluation.approved } };
}

async function _runLegacy(companyId, input) {
  const unifiedMessaging = require('../unifiedMessagingService');
  const message = String(input.message || '').slice(0, 4000);
  const result = await unifiedMessaging.sendToUser(companyId, input.userId, message, {
    type: input.type || 'nc_bridge_mirror'
  });
  return { ok: result.ok === true, result, mode: 'legacy' };
}

async function _executeGovernanceDistribution(companyId, input, governanceResult) {
  const steps = (governanceResult.execution?.executionPlan || []).filter((s) => s.validationPassed);
  if (!steps.length) return { executed: 0, results: [], success: false };

  const message = String(input.message || '').slice(0, 4000);
  const results = [];

  for (const step of steps) {
    const r = await eventGovernanceExecution.executePlan({
      executable: true,
      executionPlan: [step],
      decisionRef: governanceResult.execution.decisionRef,
      companyId,
      payload: { message, userId: input.userId, type: input.type || 'nc_bridge_mirror' }
    });
    results.push(r);
  }

  const success = results.some((r) => r.ok === true || r.success === true);
  return { executed: results.length, results, success };
}

/**
 * @param {string} companyId
 * @param {object} input — { userId, message, severity, type, eventType }
 */
async function dispatchNcBridgeMirror(companyId, input) {
  if (!companyId || !input?.userId || !input?.message) {
    return { skipped: true, reason: 'missing_params' };
  }

  const started = Date.now();
  const migrated = isNcBridgeMirrorMigrated();

  _stats.events += 1;
  _metric(METRIC_EVENTS);

  const event = buildGovernanceEvent({ companyId, ...input });
  const legacyShape = inferLegacyDistribution(input);

  let governanceResult;
  try {
    governanceResult = await eventGovernanceExecution.evaluatePrepareAndExecute(event);
  } catch (err) {
    const legacy = await _runLegacy(companyId, input);
    return { mode: 'fallback_legacy', error: err?.message, legacy };
  }

  const policyId = governanceResult.evaluation?.policyId || null;

  if (!migrated) {
    _stats.shadow += 1;
    _metric(METRIC_SHADOW_TOTAL);
    const legacy = await _runLegacy(companyId, input);
    const comparison = compareShadow(legacyShape, governanceResult);
    ecoFlags.recordObservation('oae', {
      mode: 'shadow',
      durationMs: Date.now() - started,
      match: comparison.match,
      policyId
    });
    return { mode: 'shadow', comparison, governanceResult, legacy, policyId };
  }

  _stats.migrated += 1;
  _metric(METRIC_MIGRATED);
  const distribution = await _executeGovernanceDistribution(companyId, input, governanceResult);
  ecoFlags.recordObservation('oae', {
    mode: 'governance',
    durationMs: Date.now() - started,
    policyId,
    success: distribution.success
  });

  return { mode: 'governance', governanceResult, distribution, policyId };
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    policy: 'NC_BRIDGE_MIRROR',
    events_evaluated: _stats.events || metrics[METRIC_EVENTS] || 0,
    shadow_events: _stats.shadow || metrics[METRIC_SHADOW_TOTAL] || 0,
    migrated_events: _stats.migrated || metrics[METRIC_MIGRATED] || 0
  };
}

function resetStatsForTests() {
  _stats.events = 0;
  _stats.migrated = 0;
  _stats.shadow = 0;
}

module.exports = {
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchNcBridgeMirror,
  getAuditStatus,
  resetStatsForTests,
  isNcBridgeMirrorMigrated
};
