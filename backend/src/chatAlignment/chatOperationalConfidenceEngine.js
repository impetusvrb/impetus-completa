'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { logPhaseW } = require('./phaseWLogger');
const { measureOperationalGuidanceQuality } = require('./operationalGuidanceQualityEngine');
const { stabilizeChatSemanticReasoning } = require('./chatSemanticReasoningStabilizer');
const { analyzeChatAmbiguity } = require('./chatAmbiguityAnalyzer');
const { detectChatLeakage } = require('./chatLeakageDetector');

function computeChatOperationalConfidence(user, chatPayload, ctx = {}) {
  const guidance = measureOperationalGuidanceQuality(user, chatPayload, ctx);
  const reasoning = stabilizeChatSemanticReasoning(user, chatPayload, ctx);
  const ambiguity = analyzeChatAmbiguity(user, chatPayload, ctx);
  const leakage = detectChatLeakage(user, chatPayload, ctx);

  const operational_confidence = Number(
    ((guidance.guidance_usefulness + reasoning.reasoning_quality_score) / 2).toFixed(4)
  );
  const conversational_confidence = Number(
    ((operational_confidence + ambiguity.ambiguity_score) / 2).toFixed(4)
  );
  const contextual_confidence = Number(
    (ctx.contextual_delivery?.contextual_delivery_confidence ?? 0.85).toFixed(4)
  );
  const recommendation_confidence = Number(guidance.recommendation_precision.toFixed(4));

  if (conversational_confidence < 0.6 && phaseW.isChatRuntimeObservabilityEnabled()) {
    logPhaseW('LOW_CONVERSATIONAL_CONFIDENCE', { score: conversational_confidence, shadow_only: true });
  }

  return {
    operational_confidence,
    conversational_confidence,
    contextual_confidence,
    recommendation_confidence,
    leakage_penalty: leakage.leakage_detected ? 0.08 : 0,
    stable: reasoning.stable && !leakage.leakage_detected,
    auto_correct: false
  };
}

module.exports = { computeChatOperationalConfidence };
