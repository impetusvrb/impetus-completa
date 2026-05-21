'use strict';

const { validateFunctionalIdentity } = require('../operationalIdentityGovernance/functionalIdentityValidator');

function analyzeOperationalLeakage(modules = [], identity = {}, ctx = {}) {
  const validation = validateFunctionalIdentity(identity, modules);
  const leakage_score = validation.cross_domain.length / Math.max(modules.length, 1);
  return {
    leakage_detected: validation.cross_domain.length > 0,
    leakage_score: Math.round(leakage_score * 100) / 100,
    cross_domain: validation.cross_domain,
    hierarchy_mismatch: validation.hierarchy_mismatch,
    domain_axis: identity.domain_axis,
    observability_only: ctx.observability_only !== false,
    auto_remediate: false
  };
}

module.exports = { analyzeOperationalLeakage };
