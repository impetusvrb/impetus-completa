'use strict';

const { assessGovernanceMaturity } = require('./tenantGovernanceMaturity');
const { assessDeliveryStability } = require('./tenantDeliveryStability');
const { assessOperationalCoherence } = require('./tenantOperationalCoherence');
const { assessContextualIntegrity } = require('./tenantContextualIntegrity');
const { logPhaseZ4 } = require('./phaseZ4Logger');
const flags = require('./config/phaseZ4FeatureFlags');

function computeMaturityScore(parts) {
  const weights = {
    governance_confidence: 0.25,
    delivery_stability: 0.2,
    operational_coherence: 0.2,
    contextual_integrity: 0.25,
    enforcement_safety: 0.1
  };
  let sum = 0;
  let w = 0;
  for (const [k, weight] of Object.entries(weights)) {
    if (parts[k] != null) {
      sum += parts[k] * weight;
      w += weight;
    }
  }
  return w ? Number((sum / w).toFixed(4)) : 0;
}

function computeEnforcementSafety(ctx = {}) {
  const menuStable = ctx.menu_stability?.stable !== false;
  const noCriticalUnderdelivery = ctx.underdelivery?.risk?.critical_underdelivery !== true;
  const targetingOk = ctx.targeting?.converged !== false;
  const score = (menuStable ? 0.4 : 0) + (noCriticalUnderdelivery ? 0.35 : 0) + (targetingOk ? 0.25 : 0);
  return Number(Math.min(1, score).toFixed(4));
}

function runPilotTenantMaturityEngine(tenantId, user = {}, ctx = {}) {
  const modules = ctx.visible_modules || [];
  const governance = assessGovernanceMaturity(tenantId, ctx);
  const delivery = assessDeliveryStability(modules, { ...ctx, tenant_id: tenantId });
  const coherence = assessOperationalCoherence(user, ctx);
  const integrity = assessContextualIntegrity(modules, ctx);
  const enforcement_safety = computeEnforcementSafety(ctx);

  const maturity_score = computeMaturityScore({
    governance_confidence: governance.governance_confidence,
    delivery_stability: delivery.delivery_stability,
    operational_coherence: coherence.operational_coherence,
    contextual_integrity: integrity.contextual_integrity,
    enforcement_safety
  });

  const kpi_ready = maturity_score >= 0.72 && enforcement_safety >= 0.65;

  if (flags.isPilotObservabilityEnabled()) {
    logPhaseZ4('PILOT_MATURITY_COMPUTED', {
      tenant_id: tenantId,
      maturity_score,
      kpi_channel_ready: kpi_ready,
      shadow_only: !flags.isPilotMaturityEngineEnabled()
    });
  }

  return {
    tenant_id: tenantId,
    maturity_score,
    contextual_integrity: integrity.contextual_integrity,
    delivery_stability: delivery.delivery_stability,
    governance_confidence: governance.governance_confidence,
    enforcement_safety,
    operational_coherence: coherence.operational_coherence,
    kpi_channel_ready: kpi_ready,
    governance,
    delivery,
    coherence,
    integrity,
    recommendation_only: !flags.isPilotMaturityEngineEnabled(),
    menu_only_active: true,
    kpi_enforcement_applied: false
  };
}

module.exports = { runPilotTenantMaturityEngine, computeMaturityScore, computeEnforcementSafety };
