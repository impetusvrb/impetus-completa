'use strict';

const phaseK = require('../semanticGovernance/config/phaseKFeatureFlags');
const { logPhaseK } = require('../semanticGovernance/phaseKLogger');

function sanitizeFallback(payload, ctx = {}) {
  const active = phaseK.isContextualFallbackSanitizationEnabled() || ctx.force;
  const observe = phaseK.isSemanticRuntimeObservabilityEnabled();

  const sanitized = { ...payload };
  const flags = {
    corporate_fallback_stripped: false,
    heuristic_inference_blocked: false,
    cross_domain_aggregation_blocked: false
  };

  if (payload?.corporate_aggregate || payload?._corporateFallback) {
    flags.corporate_fallback_stripped = true;
    flags.cross_domain_aggregation_blocked = true;
    if (active) {
      delete sanitized.corporate_aggregate;
      delete sanitized._corporateFallback;
    }
    if (observe) {
      logPhaseK('CONTEXTUAL_FALLBACK_SANITIZED', { type: 'corporate_aggregate', shadow_only: !active });
    }
  }

  if (payload?._heuristicGuess) {
    flags.heuristic_inference_blocked = true;
    if (active) delete sanitized._heuristicGuess;
    if (observe) logPhaseK('CONTEXTUAL_FALLBACK_SANITIZED', { type: 'heuristic', shadow_only: !active });
  }

  return {
    payload: active ? sanitized : payload,
    flags,
    enforcement_active: active,
    shadow_only: !active,
    explained: flags.corporate_fallback_stripped || flags.heuristic_inference_blocked
  };
}

module.exports = { sanitizeFallback };
