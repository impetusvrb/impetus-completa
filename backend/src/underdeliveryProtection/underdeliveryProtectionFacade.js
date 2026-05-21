'use strict';

const { analyzeUnderdeliveryRisk } = require('./underdeliveryRiskAnalyzer');
const { getOperationalVisibilityMinimums } = require('./operationalVisibilityMinimums');
const { assessHierarchyMinimumRequirements } = require('./hierarchyMinimumRequirements');
const { evaluateContextualSafetyThresholds } = require('./contextualSafetyThresholds');

function protectAgainstUnderdelivery(modules = [], ctx = {}) {
  const risk = analyzeUnderdeliveryRisk(modules, ctx);
  const tier = ctx.canonical_identity?.hierarchy_tier || 'coordination';
  const minimums = getOperationalVisibilityMinimums(tier);
  const hierarchy = assessHierarchyMinimumRequirements(modules, ctx);
  const safety = evaluateContextualSafetyThresholds({
    module_count: modules.length,
    readiness_score: ctx.readiness_score,
    leakage_probability: ctx.leakage_probability
  });

  return {
    risk,
    minimums,
    hierarchy,
    safety,
    protection_active: require('../pilotTenants/config/phaseZ3FeatureFlags').isUnderdeliveryProtectionEnabled(),
    recommendation_only: true,
    auto_remediate: false
  };
}

module.exports = { protectAgainstUnderdelivery };
