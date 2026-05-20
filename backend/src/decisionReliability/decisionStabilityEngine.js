'use strict';

const phaseR = require('./config/phaseRFeatureFlags');
const { assessRuntimeDecisionStability } = require('./runtimeDecisionStability');

function assessDecisionStability(user, recommendation = {}, ctx = {}) {
  const fingerprint = String(recommendation.text || recommendation.reply || '')
    .slice(0, 120)
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const stability = assessRuntimeDecisionStability(user, fingerprint, ctx);
  return {
    ...stability,
    enforcement_active: phaseR.isDecisionStabilityEngineEnabled(),
    shadow_only: !phaseR.isDecisionStabilityEngineEnabled()
  };
}

module.exports = { assessDecisionStability };
