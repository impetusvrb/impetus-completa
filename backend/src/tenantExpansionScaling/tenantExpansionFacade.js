'use strict';

const flags = require('../runtimeOperationalScaling/config/phaseZ11FeatureFlags');
const { assessTenantScalingMaturity } = require('./tenantScalingMaturity');
const { analyzeTenantExpansionRisk } = require('./tenantExpansionRiskAnalyzer');
const { classifyTenantExpansion } = require('./tenantExpansionClassifier');
const { adviseRolloutScaling } = require('./rolloutScalingAdvisor');

function assessTenantExpansionScaling(tenantId, z10Pack = {}, ctx = {}) {
  const scaling_maturity = assessTenantScalingMaturity(z10Pack);
  const risk = analyzeTenantExpansionRisk({
    ...z10Pack,
    scaling_maturity,
    stability: z10Pack.consolidation?.stability || ctx.stability,
    pressure: z10Pack.consolidation?.pressure,
    scaling: ctx.scaling_stability
  });
  const classification = classifyTenantExpansion(scaling_maturity, risk);
  const advisor = adviseRolloutScaling(classification, ctx.scaling_readiness || {});

  return {
    phase: 'Z.11',
    tenant_id: tenantId,
    enabled: flags.isTenantExpansionScalingEnabled(),
    scaling_maturity,
    risk,
    classification,
    advisor,
    expansion_maturity_score: scaling_maturity.scaling_maturity_score,
    recommendation_only: true,
    auto_expand: false,
    chat_enforcement: false,
    boundary_enforcement: false
  };
}

function getTenantExpansionScalingStatus(ctx = {}) {
  return {
    phase: 'Z.11',
    layer: 'tenant-expansion-scaling',
    scaling: flags.isTenantExpansionScalingEnabled(),
    observability: flags.isRuntimeExpansionObservabilityEnabled(),
    tenant_id: ctx.tenant_id
  };
}

module.exports = { assessTenantExpansionScaling, getTenantExpansionScalingStatus };
