'use strict';

const { validateOperationalSummary } = require('./operationalSummaryValidator');
const { stabilizeSummarySemantics } = require('./summarySemanticStabilizer');
const { measureOperationalSummaryRelevance } = require('./operationalSummaryRelevance');
const { detectSummaryLeakage } = require('./summaryLeakageDetector');
const { detectSummaryUnderdelivery } = require('./summaryUnderdeliveryDetector');
const { detectSummaryAuthorityConflicts } = require('./summaryAuthorityConflictDetector');
const { recordSummaryGovernanceSample } = require('./summaryGovernanceTelemetry');
const { READINESS_THRESHOLD } = require('./tenantSummaryRollbackCoordinator');

let _rolloutMemory = { activated: false, at: null, approved_by: null };

function coordinateSummaryRolloutReadiness(user, summaryPayload, ctx = {}) {
  const operational = validateOperationalSummary(user, summaryPayload, ctx);
  const semantic = stabilizeSummarySemantics(user, summaryPayload, ctx);
  const relevance = measureOperationalSummaryRelevance(user, summaryPayload, ctx);
  const leakage = detectSummaryLeakage(user, summaryPayload, ctx);
  const underdelivery = detectSummaryUnderdelivery(user, summaryPayload, ctx);
  const authority = detectSummaryAuthorityConflicts(user, summaryPayload, ctx);

  const readiness_score = Number(
    (
      (operational.summary_delivery_confidence +
        relevance.operational_relevance +
        semantic.narrative.narrative_integrity) /
      3
    ).toFixed(4)
  );

  const readiness_ok =
    readiness_score >= (ctx.readiness_threshold ?? READINESS_THRESHOLD) &&
    operational.valid &&
    !leakage.leakage_detected &&
    !underdelivery.underdelivery;

  recordSummaryGovernanceSample({
    summary_delivery_precision: operational.summary_delivery_confidence,
    summary_usefulness: relevance.summary_usefulness,
    operational_relevance: relevance.operational_relevance,
    narrative_integrity: relevance.narrative_integrity,
    contextual_alignment: relevance.contextual_alignment,
    hierarchy_coherence: relevance.hierarchy_coherence
  });

  return {
    readiness_ok,
    readiness_score,
    readiness_threshold: ctx.readiness_threshold ?? READINESS_THRESHOLD,
    operational,
    semantic,
    relevance,
    leakage,
    underdelivery,
    authority,
    stability_ok: semantic.stable
  };
}

function getRolloutMemoryState() {
  return { ..._rolloutMemory };
}

function setRolloutMemoryState(active, meta = {}) {
  _rolloutMemory = {
    activated: !!active,
    at: active ? new Date().toISOString() : null,
    approved_by: meta.approved_by || null,
    tenant_id: meta.tenant_id || null
  };
  return _rolloutMemory;
}

function resetRolloutMemory() {
  _rolloutMemory = { activated: false, at: null, approved_by: null };
}

module.exports = {
  coordinateSummaryRolloutReadiness,
  getRolloutMemoryState,
  setRolloutMemoryState,
  resetRolloutMemory,
  READINESS_THRESHOLD
};
