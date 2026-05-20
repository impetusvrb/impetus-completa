'use strict';

const flags = require('./config/tenantRolloutFeatureFlags');
const { logTenantRollout } = require('./tenantRolloutLogger');
const { getActiveChannels } = require('./tenantRolloutState');

function measureTenantGovernanceHealth(tenantId, ctx = {}) {
  const leakage = [];
  if (ctx.kpi_governance?.leakage?.detected) leakage.push({ source: 'kpi', count: ctx.kpi_governance.leakage.count });
  if (ctx.summary_governance?.leakage?.detected) leakage.push({ source: 'summary' });
  if (ctx.chat_alignment?.leakage?.detected) leakage.push({ source: 'chat' });

  const underdelivery = [];
  if (ctx.runtime_enrichment?.low_density) underdelivery.push({ type: 'low_density' });
  if (ctx.operational_density?.runtime_density_score < 0.55) {
    underdelivery.push({ type: 'density', score: ctx.operational_density.runtime_density_score });
  }

  const hierarchy_mismatch = [];
  if (ctx.kpi_hierarchy_delivery_integrity && !ctx.kpi_hierarchy_delivery_integrity.stable) {
    hierarchy_mismatch.push({ source: 'kpi' });
  }
  if (ctx.chat_reasoning_quality && !ctx.chat_reasoning_quality.stable) {
    hierarchy_mismatch.push({ source: 'chat' });
  }

  const usefulness =
    ctx.operational_usefulness?.aggregate_operational_usefulness ??
    ctx.runtime_calibration?.operational_maturity?.composite_maturity ??
    0.82;

  const leakage_penalty = leakage.length * 0.08;
  const under_penalty = underdelivery.length * 0.06;
  const hierarchy_penalty = hierarchy_mismatch.length * 0.1;

  const tenant_health_score = Number(
    Math.max(0.35, usefulness - leakage_penalty - under_penalty - hierarchy_penalty).toFixed(4)
  );

  const healthy = tenant_health_score >= 0.72 && hierarchy_mismatch.length === 0;

  if (!healthy && flags.isTenantRolloutObservabilityEnabled()) {
    logTenantRollout('TENANT_GOVERNANCE_HEALTH_DEGRADED', {
      tenant_id: tenantId,
      score: tenant_health_score,
      shadow_only: !flags.isTenantCognitiveRolloutEnabled()
    });
  }

  return {
    tenant_id: tenantId,
    tenant_health_score,
    healthy,
    leakage: { detected: leakage.length > 0, items: leakage },
    underdelivery: { detected: underdelivery.length > 0, items: underdelivery },
    hierarchy_mismatch: { detected: hierarchy_mismatch.length > 0, items: hierarchy_mismatch },
    runtime_usefulness: Number(usefulness.toFixed(4)),
    active_channels: getActiveChannels(tenantId)
  };
}

module.exports = { measureTenantGovernanceHealth };
