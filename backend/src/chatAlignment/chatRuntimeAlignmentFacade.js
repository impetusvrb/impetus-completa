'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { alignChatContextually } = require('./chatContextualAlignmentEngine');
const { measureOperationalGuidanceQuality } = require('./operationalGuidanceQualityEngine');
const { stabilizeChatSemanticReasoning } = require('./chatSemanticReasoningStabilizer');
const { computeChatOperationalConfidence } = require('./chatOperationalConfidenceEngine');
const { validateChatNarrativeIntegrity } = require('./chatNarrativeIntegrityEngine');
const { detectChatLeakage } = require('./chatLeakageDetector');
const { analyzeChatAmbiguity } = require('./chatAmbiguityAnalyzer');
const { recordChatAlignmentSample, getChatAlignmentTelemetry } = require('./chatAlignmentTelemetry');

function isChatAlignmentLayerActive() {
  return (
    phaseW.isChatRuntimeObservabilityEnabled() ||
    phaseW.isChatAlignmentRuntimeEnabled() ||
    phaseW.isChatGuidanceQualityEnabled()
  );
}

function getChatAlignmentStatus(ctx = {}) {
  return {
    phase: 'W',
    observability: phaseW.isChatRuntimeObservabilityEnabled(),
    alignment_runtime: phaseW.isChatAlignmentRuntimeEnabled(),
    guidance_quality: phaseW.isChatGuidanceQualityEnabled(),
    reasoning_stabilization: phaseW.isChatReasoningStabilizationEnabled(),
    hierarchy_isolation: phaseW.isChatHierarchyIsolationEnabled(),
    leakage_detection: phaseW.isChatLeakageDetectionEnabled(),
    global_auto_correction: false,
    telemetry: getChatAlignmentTelemetry(),
    tenant_id: ctx.tenant_id
  };
}

function enrichChatRuntimeAlignment(user, chatPayload, ctx = {}) {
  if (!isChatAlignmentLayerActive() && !ctx.force) {
    return {
      payload: chatPayload,
      chat_alignment: null,
      chat_operational_guidance: null,
      chat_runtime_confidence: null,
      chat_reasoning_quality: null,
      chat_narrative_integrity: null,
      chat_leakage_analysis: null
    };
  }

  const mergedCtx = {
    ...ctx,
    functional_axis: ctx.functional_axis || user?.functional_axis || user?.functional_area,
    tenant_id: user?.company_id,
    user_message: ctx.user_message || ctx.message
  };

  const alignment = alignChatContextually(user, chatPayload, mergedCtx);
  const guidance = measureOperationalGuidanceQuality(user, chatPayload, mergedCtx);
  const reasoning = stabilizeChatSemanticReasoning(user, chatPayload, mergedCtx);
  const confidence = computeChatOperationalConfidence(user, chatPayload, mergedCtx);
  const narrative = validateChatNarrativeIntegrity(user, chatPayload, mergedCtx);
  const leakage = detectChatLeakage(user, chatPayload, mergedCtx);
  const ambiguity = analyzeChatAmbiguity(user, chatPayload, mergedCtx);

  recordChatAlignmentSample({
    alignment_score: alignment.alignment_score,
    guidance_usefulness: guidance.guidance_usefulness,
    reasoning_quality_score: reasoning.reasoning_quality_score,
    conversational_confidence: confidence.conversational_confidence,
    narrative_integrity: narrative.narrative_integrity
  });

  const chat_alignment = {
    phase: 'W',
    shadow_only: !phaseW.isChatAlignmentRuntimeEnabled(),
    observability: phaseW.isChatRuntimeObservabilityEnabled(),
    status: getChatAlignmentStatus(mergedCtx),
    alignment_score: alignment.alignment_score,
    functional_axis: alignment.functional_axis,
    hierarchy_band: alignment.hierarchy_band,
    runtime_truth_aligned: alignment.runtime_truth_aligned,
    consistency_aligned: alignment.consistency_aligned,
    recommendations: alignment.recommendations,
    auto_correct: false,
    supervised: true
  };

  const chat_operational_guidance = {
    ...guidance,
    recommendations: guidance.generic_detected
      ? ['Reforçar densidade operacional e acções concretas — sem reescrita automática']
      : []
  };

  const chat_runtime_confidence = {
    ...confidence,
    ambiguity_score: ambiguity.ambiguity_score,
    auto_correct: false
  };

  const chat_reasoning_quality = {
    reasoning_quality_score: reasoning.reasoning_quality_score,
    stable: reasoning.stable,
    issues: reasoning.issues,
    operational_density: guidance.operational_density,
    auto_correct: false
  };

  const chat_narrative_integrity = {
    narrative_integrity: narrative.narrative_integrity,
    valid: narrative.valid,
    issues: narrative.issues,
    summary_chat_consistency: !narrative.issues.some((i) => i.type === 'summary_chat_numeric_divergence'),
    auto_correct: false
  };

  const chat_leakage_analysis = {
    ...leakage,
    ambiguity: ambiguity.issues,
    auto_block: false
  };

  return {
    payload: chatPayload,
    chat_alignment,
    chat_operational_guidance,
    chat_runtime_confidence,
    chat_reasoning_quality,
    chat_narrative_integrity,
    chat_leakage_analysis
  };
}

module.exports = {
  isChatAlignmentLayerActive,
  getChatAlignmentStatus,
  enrichChatRuntimeAlignment,
  alignChatContextually,
  measureOperationalGuidanceQuality,
  stabilizeChatSemanticReasoning,
  detectChatLeakage,
  analyzeChatAmbiguity,
  computeChatOperationalConfidence
};
