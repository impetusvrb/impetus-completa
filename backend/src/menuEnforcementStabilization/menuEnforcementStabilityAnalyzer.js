'use strict';

const { logPhaseZ4 } = require('../pilotMaturity/phaseZ4Logger');
const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');

function analyzeMenuEnforcementStability(before = [], after = [], ctx = {}) {
  const b = Array.isArray(before) ? before : [];
  const a = Array.isArray(after) ? after : [];
  const removed = b.filter((m) => !a.includes(m));
  const overPruning = removed.length > Math.max(2, Math.floor(b.length * 0.45));
  const unstable = a.length < 3 || (b.length > 0 && a.length / b.length < 0.35);

  if ((overPruning || unstable) && flags.isPilotObservabilityEnabled()) {
    logPhaseZ4('MENU_ENFORCEMENT_UNSTABLE', {
      tenant_id: ctx.tenant_id,
      over_pruning: overPruning,
      unstable_visibility: unstable,
      shadow_only: !flags.isMenuStabilityAnalysisEnabled()
    });
  }

  return {
    stable: !overPruning && !unstable,
    over_pruning: overPruning,
    unstable_visibility: unstable,
    removed_count: removed.length,
    before_count: b.length,
    after_count: a.length,
    recommendation_only: !flags.isMenuStabilityAnalysisEnabled()
  };
}

module.exports = { analyzeMenuEnforcementStability };
