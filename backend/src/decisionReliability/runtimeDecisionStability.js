'use strict';

const { validateRecommendationConsistency } = require('./recommendationConsistencyValidator');

function assessRuntimeDecisionStability(user, fingerprint, ctx = {}) {
  const key = `${user?.id}:${ctx.channel || 'default'}`;
  const validation = validateRecommendationConsistency(key, fingerprint);
  const runtime_decision_stability = validation.consistent ? 0.92 : 0.55;
  return {
    runtime_decision_stability,
    ...validation
  };
}

module.exports = { assessRuntimeDecisionStability };
