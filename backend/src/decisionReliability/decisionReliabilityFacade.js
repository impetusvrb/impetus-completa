'use strict';

const phaseR = require('./config/phaseRFeatureFlags');
const { assessDecisionReliability } = require('./cognitiveDecisionReliabilityEngine');
const { computeOperationalTrust } = require('./operationalTrustEngine');
const { analyzeRecommendationQuality } = require('./recommendationQualityAnalyzer');
const { detectCognitiveAmbiguity } = require('./cognitiveAmbiguityDetector');
const { assessDecisionStability } = require('./decisionStabilityEngine');
const { assessHumanOversight } = require('./humanOversightReliability');
const { recordReliabilitySample, getReliabilityTelemetry } = require('./reliabilityTelemetry');

function isReliabilityLayerActive() {
  return (
    phaseR.isDecisionReliabilityObservabilityEnabled() ||
    phaseR.isDecisionReliabilityEnabled() ||
    phaseR.isOperationalTrustEngineEnabled() ||
    phaseR.isRecommendationQualityAnalysisEnabled() ||
    phaseR.isDecisionStabilityEngineEnabled() ||
    phaseR.isHumanOversightReliabilityEnabled()
  );
}

function buildSignalsFromCtx(ctx = {}) {
  const consistency = ctx.runtime_consistency || {};
  const delivery = ctx.contextual_delivery || {};
  const sync = consistency.synchronization || {};

  return {
    cognitive_consistency_score: consistency.cognitive_consistency_score,
    contextual_delivery_confidence: delivery.contextual_delivery_confidence,
    canonical_axis: sync.canonical_axis || delivery.targeting?.domain?.domain,
    ambiguous_targeting: delivery.ambiguous_targeting,
    interchannel_divergence: consistency.interchannel?.divergence_detected,
    degraded: ctx.degraded === true
  };
}

function enrichWithDecisionReliability(user, legacyResponse, ctx = {}) {
  if (!isReliabilityLayerActive() && !ctx.force) {
    return { response: legacyResponse, decision_reliability: null };
  }

  const signals = buildSignalsFromCtx(ctx);
  const reliability = assessDecisionReliability(signals);
  const trust = computeOperationalTrust(signals, {});
  const quality = analyzeRecommendationQuality({}, signals);
  const ambiguity = detectCognitiveAmbiguity(signals, {});
  const stability = assessDecisionStability(user, {}, { channel: 'dashboard_me' });
  const oversight = assessHumanOversight({
    low_trust: trust.low_trust,
    high_ambiguity: ambiguity.cognitive_ambiguity_score > 0.45,
    weak_guidance: quality.operational_usefulness < 0.5,
    escalate_recommended: trust.low_trust && ambiguity.cognitive_ambiguity_score > 0.5
  });

  const operational_guidance_integrity = Number(
    ((quality.recommendation_quality + (1 - ambiguity.cognitive_ambiguity_score)) / 2).toFixed(4)
  );

  recordReliabilitySample({
    cognitive_decision_reliability: reliability.cognitive_decision_reliability,
    operational_trust_score: trust.operational_trust_score,
    runtime_decision_confidence: reliability.runtime_decision_confidence,
    contextual_recommendation_quality: quality.recommendation_quality,
    cognitive_ambiguity_score: ambiguity.cognitive_ambiguity_score,
    operational_guidance_integrity,
    runtime_decision_stability: stability.runtime_decision_stability,
    supervision_recommendation_score: oversight.supervision_recommendation_score
  });

  const decision_reliability_block = {
    phase: 'R',
    shadow_only: reliability.shadow_only,
    observability: phaseR.isDecisionReliabilityObservabilityEnabled(),
    flags: {
      decision_reliability: phaseR.isDecisionReliabilityEnabled(),
      operational_trust: phaseR.isOperationalTrustEngineEnabled(),
      recommendation_quality: phaseR.isRecommendationQualityAnalysisEnabled(),
      decision_stability: phaseR.isDecisionStabilityEngineEnabled(),
      human_oversight: phaseR.isHumanOversightReliabilityEnabled()
    },
    reliability,
    trust,
    quality,
    ambiguity,
    stability,
    human_oversight: oversight,
    operational_guidance_integrity,
    telemetry_snapshot: getReliabilityTelemetry(),
    auto_enforce: false
  };

  return { response: legacyResponse, decision_reliability: decision_reliability_block };
}

function enrichChatDecisionReliability(user, chatPayload = {}, ctx = {}) {
  if (!isReliabilityLayerActive() && !ctx.force) {
    return { payload: chatPayload, decision_reliability: null };
  }

  const signals = buildSignalsFromCtx(ctx);
  const recommendation = {
    text: chatPayload.reply || chatPayload.message || chatPayload.content,
    degraded: chatPayload.degraded,
    domain: signals.canonical_axis
  };

  const reliability = assessDecisionReliability({ ...signals, degraded: chatPayload.degraded });
  const trust = computeOperationalTrust(signals, recommendation);
  const quality = analyzeRecommendationQuality(recommendation, signals);
  const ambiguity = detectCognitiveAmbiguity(signals, recommendation);
  const stability = assessDecisionStability(user, recommendation, { channel: 'dashboard_chat' });
  const oversight = assessHumanOversight({
    low_trust: trust.low_trust,
    high_ambiguity: ambiguity.cognitive_ambiguity_score > 0.45,
    weak_guidance: trust.recommendation?.weak_guidance || quality.operational_usefulness < 0.5,
    escalate_recommended: trust.operational_trust_score < 0.5
  });

  recordReliabilitySample({
    cognitive_decision_reliability: reliability.cognitive_decision_reliability,
    operational_trust_score: trust.operational_trust_score,
    contextual_recommendation_quality: quality.recommendation_quality,
    cognitive_ambiguity_score: ambiguity.cognitive_ambiguity_score,
    supervision_recommendation_score: oversight.supervision_recommendation_score
  });

  return {
    payload: chatPayload,
    decision_reliability: {
      phase: 'R',
      channel: 'dashboard_chat',
      reliability,
      trust,
      quality,
      ambiguity,
      stability,
      human_oversight: oversight,
      shadow_only: true,
      auto_enforce: false
    }
  };
}

function enrichKpiReliability(user, kpis, ctx = {}) {
  if (!isReliabilityLayerActive() && !ctx.force) return { kpis, decision_reliability: null };
  const signals = buildSignalsFromCtx(ctx);
  const r = assessDecisionReliability(signals);
  return { kpis, decision_reliability: { kpi_channel: r, shadow_only: true } };
}

function enrichSummaryReliability(user, summary, ctx = {}) {
  if (!isReliabilityLayerActive() && !ctx.force) return { summary, decision_reliability: null };
  const signals = buildSignalsFromCtx(ctx);
  const rec = { text: summary?.summary || summary?.text, degraded: !summary?.sources };
  const quality = analyzeRecommendationQuality(rec, signals);
  return { summary, decision_reliability: { summary_quality: quality, shadow_only: true } };
}

function getReliabilityReport() {
  return {
    telemetry: getReliabilityTelemetry(),
    flags: {
      IMPETUS_DECISION_RELIABILITY: phaseR.isDecisionReliabilityEnabled(),
      IMPETUS_OPERATIONAL_TRUST_ENGINE: phaseR.isOperationalTrustEngineEnabled(),
      IMPETUS_RECOMMENDATION_QUALITY_ANALYSIS: phaseR.isRecommendationQualityAnalysisEnabled(),
      IMPETUS_DECISION_STABILITY_ENGINE: phaseR.isDecisionStabilityEngineEnabled(),
      IMPETUS_HUMAN_OVERSIGHT_RELIABILITY: phaseR.isHumanOversightReliabilityEnabled(),
      IMPETUS_DECISION_RELIABILITY_OBSERVABILITY: phaseR.isDecisionReliabilityObservabilityEnabled()
    },
    shadow_first: true
  };
}

module.exports = {
  isReliabilityLayerActive,
  enrichWithDecisionReliability,
  enrichChatDecisionReliability,
  enrichKpiReliability,
  enrichSummaryReliability,
  getReliabilityReport,
  assessDecisionReliability
};
