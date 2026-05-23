'use strict';

function validateSustainabilityRuntimeIntegrity(liveValidation = {}) {
  const lv = liveValidation.environmental_live_validation || liveValidation;
  return {
    sustainability_runtime_integrity: lv.esg_contextual_valid === true && lv.regulatory_integrity === true,
    degraded: lv.esg_contextual_valid !== true
  };
}

module.exports = { validateSustainabilityRuntimeIntegrity };
