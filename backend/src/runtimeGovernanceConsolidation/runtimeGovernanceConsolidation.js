'use strict';

const flags = require('./config/phaseZ10FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { assessTenantGovernanceMaturity } = require('../tenantGovernanceMaturity/tenantMaturityFacade');
const { assessTenantRuntimeStability } = require('../tenantRuntimeStability/tenantStabilityFacade');
const { assessRuntimeSustainability } = require('../runtimeSustainability/runtimeSustainabilityFacade');
const { assessTenantExpansionReadiness } = require('../tenantExpansionReadiness/expansionReadinessFacade');
const { assessGovernancePressure } = require('../governancePressure/governancePressureFacade');
const { assessOperationalUsefulness } = require('../runtimeOperationalUsefulness/operationalUsefulnessFacade');
const { buildGovernanceEvolutionTimeline } = require('./governanceEvolutionTimeline');
const { buildTenantGovernanceHistory } = require('./tenantGovernanceHistory');
const { buildRolloutMaturityEvolution } = require('./rolloutMaturityEvolution');

function isConsolidationContextActive(tenantId, ctx = {}) {
  return isPilotTenant(tenantId) || ctx.force_consolidation === true;
}

function runRuntimeGovernanceConsolidation(tenantId, user = {}, legacyResponse = {}, ctx = {}) {
  if (!tenantId || !isConsolidationContextActive(tenantId, ctx)) {
    return {
      tenant_governance_maturity: null,
      runtime_sustainability: null,
      runtime_operational_usefulness: null,
      consolidation: null
    };
  }

  const mergedCtx = {
    ...ctx,
    tenant_id: tenantId,
    visible_modules: legacyResponse.visible_modules || ctx.visible_modules,
    observability_layers: ctx.observability_layers ?? 6,
    pilot_runtime: ctx.pilot_runtime,
    pilot_operational_stabilization: ctx.pilot_operational_stabilization
  };

  const stability = assessTenantRuntimeStability(tenantId, mergedCtx);
  mergedCtx.stability_pack = stability;

  const maturity = assessTenantGovernanceMaturity(tenantId, user, {
    ...mergedCtx,
    stability_pack: stability
  });
  const sustainability = assessRuntimeSustainability(
    tenantId,
    { maturity, stability },
    mergedCtx
  );
  const expansion = assessTenantExpansionReadiness(tenantId, {
    maturity,
    stability,
    sustainability
  });
  const pressure = assessGovernancePressure(tenantId, stability, mergedCtx);
  const usefulness = assessOperationalUsefulness(
    tenantId,
    { maturity, stability, sustainability, pressure },
    mergedCtx
  );

  let summaryRollback = { rollback_safe: true };
  try {
    summaryRollback = require('../summaryRuntimeActivation/summaryRuntimeRollbackReadiness').assessSummaryRollbackReadiness(
      tenantId,
      mergedCtx
    );
  } catch {
    /* optional */
  }
  let kpiRollback = { rollback_safe: true };
  try {
    kpiRollback = require('../kpiPilotObservability/kpiRollbackReadiness').assessKpiRollbackReadiness(tenantId, mergedCtx);
  } catch {
    /* optional */
  }

  const consolidation = {
    phase: 'Z.10',
    tenant_id: tenantId,
    observability: flags.isRuntimeConsolidationObservabilityEnabled(),
    maturity,
    stability,
    sustainability,
    expansion,
    pressure,
    usefulness,
    evolution: buildGovernanceEvolutionTimeline(tenantId, { maturity }),
    history: buildTenantGovernanceHistory(tenantId),
    rollout_evolution: buildRolloutMaturityEvolution({ maturity, stability, sustainability, expansion }),
    rollback_readiness: {
      kpi: kpiRollback,
      summary: summaryRollback,
      menu_preserved: true
    },
    chat_enforcement: false,
    boundary_enforcement: false,
    global_activation: false,
    auto_remediate: false,
    auto_expand: false,
    graceful_degradation: true,
    payload_legacy_preserved: true
  };

  if (flags.isRuntimeConsolidationObservabilityEnabled() && stability.unstable) {
    require('./phaseZ10Logger').logPhaseZ10('TENANT_INSTABILITY_OBSERVED', {
      tenant_id: tenantId,
      issues: stability.issues
    });
  }

  return {
    tenant_governance_maturity: maturity,
    runtime_sustainability: sustainability,
    runtime_operational_usefulness: usefulness,
    consolidation
  };
}

module.exports = { runRuntimeGovernanceConsolidation, isConsolidationContextActive };
