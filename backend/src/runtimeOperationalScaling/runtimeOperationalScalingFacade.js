'use strict';

const flags = require('./config/phaseZ11FeatureFlags');
const { logPhaseZ11 } = require('./phaseZ11Logger');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { assessTenantExpansionScaling } = require('../tenantExpansionScaling/tenantExpansionFacade');
const { assessScalingStability } = require('./scalingStabilityFacade');
const { assessGovernanceLoadProtection } = require('../governanceLoadProtection/governanceLoadProtectionFacade');
const { assessRuntimeScalingReadiness } = require('../runtimeScalingReadiness/runtimeScalingReadinessFacade');
const { consolidateExpansionObservability } = require('../runtimeExpansionObservability/expansionObservabilityFacade');

function isScalingContextActive(tenantId, ctx = {}) {
  return isPilotTenant(tenantId) || ctx.force_scaling === true;
}

function getRuntimeOperationalScalingStatus(ctx = {}) {
  return {
    phase: 'Z.11',
    layer: 'runtime-operational-scaling',
    tenant_expansion_scaling: flags.isTenantExpansionScalingEnabled(),
    runtime_scaling_readiness: flags.isRuntimeScalingReadinessEnabled(),
    governance_load_protection: flags.isGovernanceLoadProtectionEnabled(),
    runtime_expansion_control: flags.isRuntimeExpansionControlEnabled(),
    observability: flags.isRuntimeExpansionObservabilityEnabled(),
    chat_enforcement: false,
    boundary_enforcement: false,
    global_activation: false,
    autonomous_scaling: false,
    tenant_id: ctx.tenant_id
  };
}

function applyRuntimeOperationalScaling(user, legacyResponse = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isScalingContextActive(tenantId, ctx) && !flags.isRuntimeExpansionObservabilityEnabled()) {
    return {
      response: legacyResponse,
      tenant_expansion_maturity: null,
      runtime_scaling_readiness: null,
      governance_load_protection: null
    };
  }

  let z10Pack = {};
  try {
    const z10 = require('../runtimeGovernanceConsolidation/runtimeGovernanceConsolidationFacade');
    const consolidated = z10.applyTenantRuntimeConsolidation(user, legacyResponse, ctx);
    z10Pack = {
      tenant_governance_maturity: consolidated.tenant_governance_maturity,
      runtime_sustainability: consolidated.runtime_sustainability,
      runtime_operational_usefulness: consolidated.runtime_operational_usefulness,
      consolidation: consolidated.consolidation,
      rollback_readiness: consolidated.consolidation?.rollback_readiness
    };
  } catch {
    z10Pack = ctx.z10_pack || {};
  }

  const mergedCtx = {
    ...ctx,
    tenant_id: tenantId,
    observability_layers: ctx.observability_layers ?? 7,
    visible_modules: legacyResponse.visible_modules
  };

  const scaling_stability = assessScalingStability(tenantId, z10Pack, mergedCtx);
  mergedCtx.scaling_stability = scaling_stability;

  const governance_load_protection = assessGovernanceLoadProtection(tenantId, z10Pack, mergedCtx);
  const expansion = assessTenantExpansionScaling(tenantId, z10Pack, {
    ...mergedCtx,
    scaling_stability,
    scaling_readiness: {}
  });

  const runtime_scaling_readiness = assessRuntimeScalingReadiness(tenantId, {
    expansion,
    scaling_stability,
    governance_load_protection,
    risk: expansion.risk,
    classification: expansion.classification,
    z10: z10Pack,
    rollback_readiness: z10Pack.rollback_readiness,
    force: ctx.force_scaling
  });

  const observability = consolidateExpansionObservability(tenantId, {
    force: ctx.force_scaling,
    expansion,
    scaling_stability,
    governance_load_protection,
    readiness: runtime_scaling_readiness,
    z10: z10Pack
  });

  const tenant_expansion_maturity = {
    phase: 'Z.11',
    tenant_id: tenantId,
    ...expansion,
    observability,
    cockpit_usefulness_preserved:
      z10Pack.runtime_operational_usefulness?.cockpit_usefulness_preserved !== false,
    payload_legacy_preserved: true,
    auto_expand: false,
    auto_remediate: false,
    graceful_degradation: true
  };

  if (scaling_stability.scaling_instability_detected && flags.isRuntimeExpansionObservabilityEnabled()) {
    logPhaseZ11('SCALING_INSTABILITY_OBSERVED', { tenant_id: tenantId });
  }

  return {
    response: legacyResponse,
    tenant_expansion_maturity,
    runtime_scaling_readiness,
    governance_load_protection
  };
}

function getOperationalScalingReport(user = {}, ctx = {}) {
  return { ok: true, ...applyRuntimeOperationalScaling(user, ctx.legacy || {}, ctx) };
}

module.exports = {
  getRuntimeOperationalScalingStatus,
  applyRuntimeOperationalScaling,
  getOperationalScalingReport,
  isScalingContextActive
};
