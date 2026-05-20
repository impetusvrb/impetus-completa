'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { getSummaryRolloutStatus, assessSummaryRolloutReadiness } = require('./summaryGovernanceActivationEngine');
const { coordinateSummaryRolloutReadiness } = require('./summaryRuntimeCoordinator');
const { measureOperationalSummaryRelevance } = require('./operationalSummaryRelevance');
const { stabilizeSummarySemantics } = require('./summarySemanticStabilizer');
const { detectSummaryLeakage } = require('./summaryLeakageDetector');
const { detectSummaryUnderdelivery } = require('./summaryUnderdeliveryDetector');

function isSummaryRolloutLayerActive() {
  return (
    phaseV.isSummaryGovernanceObservabilityEnabled() ||
    phaseV.isSummaryGovernanceRolloutEnabled() ||
    phaseV.isSummaryRelevanceEngineEnabled()
  );
}

function enrichSummaryGovernanceRollout(user, summaryPayload, ctx = {}) {
  if (!isSummaryRolloutLayerActive() && !ctx.force) {
    return {
      payload: summaryPayload,
      summary_governance: null,
      summary_relevance: null,
      summary_semantic_alignment: null,
      summary_narrative_integrity: null,
      summary_delivery_precision: null
    };
  }

  const mergedCtx = {
    ...ctx,
    functional_axis: ctx.functional_axis || user?.functional_axis || user?.functional_area,
    tenant_id: user?.company_id
  };

  const coordination = coordinateSummaryRolloutReadiness(user, summaryPayload, mergedCtx);
  const relevance = measureOperationalSummaryRelevance(user, summaryPayload, mergedCtx);
  const semantic = stabilizeSummarySemantics(user, summaryPayload, mergedCtx);
  const leakage = detectSummaryLeakage(user, summaryPayload, mergedCtx);
  const underdelivery = detectSummaryUnderdelivery(user, summaryPayload, mergedCtx);

  const summary_governance = {
    phase: 'V',
    shadow_only: !phaseV.isSummaryGovernanceRolloutEnabled(),
    observability: phaseV.isSummaryGovernanceObservabilityEnabled(),
    status: getSummaryRolloutStatus(mergedCtx),
    readiness_score: coordination.readiness_score,
    leakage: { detected: leakage.leakage_detected, count: leakage.leakage_count },
    underdelivery: { detected: underdelivery.underdelivery },
    auto_correct: false,
    supervised: true
  };

  const summary_relevance = {
    operational_relevance: relevance.operational_relevance,
    summary_usefulness: relevance.summary_usefulness,
    hierarchy_coherence: relevance.hierarchy_coherence,
    contextual_alignment: relevance.contextual_alignment,
    recommendations: semantic.narrative.recommendations,
    auto_correct: false
  };

  const summary_semantic_alignment = {
    summary_semantic_alignment: semantic.summary_semantic_alignment,
    narrative_alignment_score: semantic.narrative.narrative_alignment_score,
    stable: semantic.stable,
    auto_correct: false
  };

  const summary_narrative_integrity = {
    narrative_integrity: relevance.narrative_integrity,
    issues: semantic.narrative.issues,
    recommendations: semantic.narrative.recommendations,
    auto_correct: false
  };

  const summary_delivery_precision = {
    summary_delivery_precision: coordination.operational.summary_delivery_confidence,
    delivery_precision_score: coordination.operational.summary_delivery_confidence,
    contextual_alignment_score: relevance.contextual_alignment,
    hierarchy_integrity_score: relevance.hierarchy_coherence,
    semantic_relevance_score: relevance.operational_relevance,
    auto_correct: false
  };

  return {
    payload: summaryPayload,
    summary_governance,
    summary_relevance,
    summary_semantic_alignment,
    summary_narrative_integrity,
    summary_delivery_precision,
    coordination
  };
}

module.exports = {
  isSummaryRolloutLayerActive,
  enrichSummaryGovernanceRollout,
  getSummaryRolloutStatus,
  assessSummaryRolloutReadiness,
  coordinateSummaryRolloutReadiness
};
