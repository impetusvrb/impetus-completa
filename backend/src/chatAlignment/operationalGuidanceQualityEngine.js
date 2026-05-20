'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { logPhaseW } = require('./phaseWLogger');
const { extractReplyText } = require('./chatPayloadUtils');

function measureOperationalGuidanceQuality(user, chatPayload, ctx = {}) {
  const text = extractReplyText(chatPayload);
  const len = text.length;
  const hasAction = /\b(recomend|prioriz|verificar|ação|mitigar|executar|agendar|inspecionar)\b/i.test(text);
  const hasMetric = /\b\d+([.,]\d+)?%?\b/.test(text);
  const hasStructure = /\n|[-•]|\d+\./.test(text);
  const generic = /\b(em geral|de forma geral|situação normal|conforme esperado|sem grandes alterações)\b/i.test(text);

  const operational_density = Number(
    Math.min(1, (len > 180 ? 0.25 : len / 800) + (hasAction ? 0.35 : 0) + (hasMetric ? 0.25 : 0.1) + (hasStructure ? 0.15 : 0)).toFixed(4)
  );
  const guidance_usefulness = Number(
    Math.min(1, operational_density + (hasAction ? 0.2 : 0) - (generic ? 0.25 : 0)).toFixed(4)
  );
  const actionability = hasAction ? 0.88 : 0.45;
  const recommendation_precision = hasMetric && hasAction ? 0.9 : hasAction ? 0.75 : 0.5;

  if (generic && phaseW.isChatRuntimeObservabilityEnabled()) {
    logPhaseW('GENERIC_OPERATIONAL_RESPONSE_DETECTED', { shadow_only: true });
  }
  if (guidance_usefulness < 0.55 && phaseW.isChatRuntimeObservabilityEnabled()) {
    logPhaseW('LOW_GUIDANCE_UTILITY_DETECTED', { score: guidance_usefulness, shadow_only: true });
  }

  return {
    guidance_usefulness,
    operational_usefulness: guidance_usefulness,
    actionability: Number(actionability.toFixed(4)),
    contextual_usefulness: Number(((guidance_usefulness + operational_density) / 2).toFixed(4)),
    recommendation_precision: Number(recommendation_precision.toFixed(4)),
    operational_density,
    generic_detected: generic,
    auto_correct: false,
    enforcement_active: phaseW.isChatGuidanceQualityEnabled()
  };
}

module.exports = { measureOperationalGuidanceQuality };
