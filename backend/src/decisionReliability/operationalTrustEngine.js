'use strict';

const phaseR = require('./config/phaseRFeatureFlags');
const { resolveContextualTrust } = require('./contextualTrustResolver');
const { evaluateRecommendationTrust } = require('./recommendationTrustEvaluator');
const { evaluateOperationalTrust } = require('./operationalTrustEvaluator');

function computeOperationalTrust(ctx = {}, recommendation = {}) {
  const contextual = resolveContextualTrust(ctx);
  const recTrust = evaluateRecommendationTrust(recommendation);
  const trust = evaluateOperationalTrust({
    ...ctx,
    ambiguous: contextual.uncertain,
    weak_guidance: recTrust.weak_guidance,
    degraded: recommendation.degraded
  });

  return {
    ...trust,
    contextual,
    recommendation: recTrust,
    enforcement_active: phaseR.isOperationalTrustEngineEnabled(),
    shadow_only: !phaseR.isOperationalTrustEngineEnabled()
  };
}

module.exports = { computeOperationalTrust };
