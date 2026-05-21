'use strict';

const flags = require('../pilotTenants/config/phaseZ3FeatureFlags');
const { logPhaseZ3 } = require('../pilotTenants/phaseZ3Logger');
const { TIER_MINIMUMS } = require('../menuRuntimeStabilization/minimumOperationalVisibility');

function analyzeUnderdeliveryRisk(modules = [], ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier || 'coordination';
  const minimum = TIER_MINIMUMS[tier] || TIER_MINIMUMS.coordination;
  const missing = minimum.filter((m) => !modules.includes(m));
  const critical = modules.length <= 2 || !modules.includes('dashboard');

  if ((missing.length || critical) && flags.isPilotRuntimeObservabilityEnabled()) {
    logPhaseZ3('UNDERDELIVERY_RISK_DETECTED', {
      tenant_id: ctx.tenant_id,
      tier,
      missing,
      critical,
      shadow_only: !flags.isUnderdeliveryProtectionEnabled()
    });
  }

  return {
    underdelivery_risk: missing.length > 0 || critical,
    critical_underdelivery: critical,
    missing_minimum: missing,
    module_count: modules.length,
    auto_remediate: false
  };
}

module.exports = { analyzeUnderdeliveryRisk };
