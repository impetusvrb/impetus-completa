'use strict';

function validateSustainabilityNarrativeGovernance(narrative = {}) {
  return {
    generic_enterprise: narrative.generic_enterprise === true,
    focus_compliance: Array.isArray(narrative.focus) && narrative.focus.includes('conformidade')
  };
}

module.exports = { validateSustainabilityNarrativeGovernance };
