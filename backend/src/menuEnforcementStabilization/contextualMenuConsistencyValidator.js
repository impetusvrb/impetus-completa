'use strict';

const { validateContextualMenuTargeting } = require('../contextualEnforcement/contextualMenuTargetingValidator');
const { buildCanonicalDeliveryMatrix } = require('../contextualEnforcement/canonicalDeliveryMatrix');

function validateMenuConsistency(modules = [], ctx = {}) {
  const identity = ctx.canonical_identity || {};
  const matrix = buildCanonicalDeliveryMatrix(identity, ctx);
  const targeting = validateContextualMenuTargeting(matrix, ctx);
  const inconsistent = (targeting.violations || []).length > 0;

  return {
    consistent: !inconsistent,
    violations: targeting.violations || [],
    targeting_precision: targeting.precision ?? targeting.targeting_precision ?? 1,
    recommendation_only: true
  };
}

module.exports = { validateMenuConsistency };
