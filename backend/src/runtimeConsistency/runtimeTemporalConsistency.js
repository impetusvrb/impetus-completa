'use strict';

const phaseQ = require('./config/phaseQFeatureFlags');
const { stabilizeTemporalContext } = require('./temporalContextStabilizer');
const { assessTemporalIntegrity } = require('./contextualTemporalIntegrity');

function evaluateRuntimeTemporalConsistency(user, sync, ctx = {}) {
  const temporal = stabilizeTemporalContext(user, sync, ctx);
  const integrity = assessTemporalIntegrity(temporal);
  return {
    ...temporal,
    ...integrity,
    enforcement_active: phaseQ.isTemporalContextStabilizationEnabled(),
    shadow_only: !phaseQ.isTemporalContextStabilizationEnabled(),
    auto_refresh: false
  };
}

module.exports = { evaluateRuntimeTemporalConsistency };
