'use strict';

const phaseR = require('./config/phaseRFeatureFlags');
const { logPhaseR } = require('./phaseRLogger');
const { analyzeContextualUncertainty } = require('./contextualUncertaintyAnalyzer');
const { resolveOperationalAmbiguity } = require('./operationalAmbiguityResolver');

function detectCognitiveAmbiguity(ctx = {}, recommendation = {}) {
  const uncertainty = analyzeContextualUncertainty(ctx);
  const text = String(recommendation.text || recommendation.reply || '');
  const multiple = (text.match(/\?/g) || []).length > 2 || /ou então|alternativamente|pode ser/i.test(text);
  const ambiguity = resolveOperationalAmbiguity({
    vague_language: /talvez|incerto|não sei/i.test(text),
    multiple_interpretations: multiple,
    guidance_conflict: ctx.interchannel_divergence
  });

  const cognitive_ambiguity_score = Number(
    Math.min(1, uncertainty.uncertainty_score + ambiguity.score).toFixed(4)
  );

  if (phaseR.isDecisionReliabilityObservabilityEnabled()) {
    if (ambiguity.operational_ambiguity) logPhaseR('COGNITIVE_AMBIGUITY_DETECTED', { shadow_only: true });
    if (uncertainty.contextual_uncertainty) logPhaseR('OPERATIONAL_UNCERTAINTY_DETECTED', { shadow_only: true });
    if (multiple) logPhaseR('MULTIPLE_INTERPRETATION_CONFLICT', { shadow_only: true });
  }

  return {
    cognitive_ambiguity_score,
    uncertainty,
    ambiguity,
    enforcement_active: false,
    shadow_only: true
  };
}

module.exports = { detectCognitiveAmbiguity };
