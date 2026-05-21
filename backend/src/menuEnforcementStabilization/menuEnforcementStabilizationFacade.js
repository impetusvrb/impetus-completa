'use strict';

const { analyzeMenuEnforcementStability } = require('./menuEnforcementStabilityAnalyzer');
const { validateMenuConsistency } = require('./contextualMenuConsistencyValidator');
const { stabilizeModuleVisibility } = require('./moduleVisibilityStabilizer');
const { analyzeSharedModuleSafety } = require('./sharedModuleSafetyAnalyzer');
const { adviseMenuRecovery } = require('./runtimeMenuRecoveryAdvisor');

function stabilizeMenuEnforcement(before = [], after = [], ctx = {}) {
  const stability = analyzeMenuEnforcementStability(before, after, ctx);
  const consistency = validateMenuConsistency(after, ctx);
  const shared = analyzeSharedModuleSafety(after);
  const recovery = adviseMenuRecovery(after, { ...ctx, menu_stability: stability });
  const stabilized = stabilizeModuleVisibility(after, ctx);

  return {
    phase: 'Z.4',
    menu_stability: stability,
    consistency,
    shared_module_safety: shared,
    recovery,
    stabilized_preview: stabilized,
    enforcement_applied: false,
    recommendation_only: true
  };
}

module.exports = { stabilizeMenuEnforcement };
