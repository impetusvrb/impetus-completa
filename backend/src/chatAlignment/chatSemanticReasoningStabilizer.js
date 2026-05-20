'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { logPhaseW } = require('./phaseWLogger');
const { extractReplyText } = require('./chatPayloadUtils');
const { measureOperationalGuidanceQuality } = require('./operationalGuidanceQualityEngine');

const SHALLOW = /\b(resumindo|em suma|basicamente|de modo geral)\b/i;
const GENERIC = /\b(é importante|deve-se considerar|recomenda-se cautela)\b/i;

function stabilizeChatSemanticReasoning(user, chatPayload, ctx = {}) {
  const text = extractReplyText(chatPayload);
  const guidance = measureOperationalGuidanceQuality(user, chatPayload, ctx);
  const issues = [];

  if (text.length < 100) issues.push({ type: 'shallow_reasoning', severity: 'medium' });
  if (SHALLOW.test(text) && !/\d/.test(text)) issues.push({ type: 'shallow_reasoning', severity: 'medium' });
  if (GENERIC.test(text) && guidance.operational_density < 0.5) issues.push({ type: 'generic_output', severity: 'high' });
  if (guidance.operational_density < 0.45) issues.push({ type: 'low_operational_relevance', severity: 'high' });
  if (ctx.runtime_consistency?.interchannel?.divergence_detected) {
    issues.push({ type: 'reasoning_inconsistency', severity: 'high' });
  }
  if (!ctx.contextual_delivery && text.length > 150) {
    issues.push({ type: 'contextual_gap', severity: 'low' });
  }

  const quality = Number(Math.max(0.4, 1 - issues.length * 0.1).toFixed(4));

  if (issues.some((i) => i.type === 'generic_output' || i.type === 'low_operational_relevance')) {
    if (phaseW.isChatRuntimeObservabilityEnabled()) {
      logPhaseW('WEAK_OPERATIONAL_REASONING_DETECTED', { count: issues.length, shadow_only: true });
    }
  }

  return {
    reasoning_quality_score: quality,
    stable: issues.filter((i) => i.severity === 'critical').length === 0,
    issues,
    guidance,
    auto_correct: false,
    enforcement_active: phaseW.isChatReasoningStabilizationEnabled()
  };
}

module.exports = { stabilizeChatSemanticReasoning };
