'use strict';

const { resolveModuleEligibility } = require('./preciseModuleEligibilityResolver');

function resolveContextualModulePrecision(modules, user, ctx = {}) {
  const base = resolveModuleEligibility(modules, user, ctx);
  const overdelivery = base.ineligible.filter((i) =>
    ['exclusive_domain_mismatch', 'semantic_safety_quality_isolation', 'shared_governed_denied'].includes(
      String(i.reason)
    )
  );
  const underdelivery_risk = base.eligible_modules.length < 2 && (modules?.length || 0) > 2;

  return {
    ...base,
    contextual_precision_score: base.module_delivery_confidence,
    overdelivery_candidates: overdelivery,
    underdelivery_risk,
    semantic_precision_score: Number((base.module_delivery_confidence * 0.95).toFixed(4))
  };
}

module.exports = { resolveContextualModulePrecision };
