'use strict';

const { validateEnvironmentalSemanticIsolation } = require('../../validators/environmentalSemanticIsolationValidator');

function validateEnvironmentalSemanticIsolationRuntime(payload = {}, consolidated = {}) {
  const base = validateEnvironmentalSemanticIsolation(payload, consolidated);
  const cross_domain_clean = base.cross_domain_clean ?? base.ok === true;
  return {
    ...base,
    cross_domain_clean,
    environmental_semantic_isolation: base.ok && cross_domain_clean,
    visual_leakage: !cross_domain_clean
  };
}

module.exports = { validateEnvironmentalSemanticIsolationRuntime };
