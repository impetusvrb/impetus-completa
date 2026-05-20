'use strict';

const { logPhaseP } = require('./phasePLogger');
const phaseP = require('./config/phasePFeatureFlags');

function detectHierarchyConflict(ctx = {}) {
  const band = ctx.hierarchy_band;
  const moduleExecutive = ctx.has_executive_module && ['operator', 'supervisor'].includes(band);
  const detected = moduleExecutive;
  if (detected && phaseP.isContextualStabilizationObservabilityEnabled()) {
    logPhaseP('HIERARCHY_CONFLICT_DETECTED', { band, shadow_only: true });
  }
  return { hierarchy_conflict: detected, reason: moduleExecutive ? 'executive_module_on_low_hierarchy' : null };
}

module.exports = { detectHierarchyConflict };
