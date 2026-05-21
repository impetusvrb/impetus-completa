'use strict';

const { logPhaseZ4 } = require('./phaseZ4Logger');
const flags = require('./config/phaseZ4FeatureFlags');

function assessGovernanceMaturity(tenantId, ctx = {}) {
  let readiness = { enforcement_ready: false, readiness_score: 0 };
  try {
    readiness = require('../tenantProfiling/tenantProfileFacade').assessTenantDeliveryReadiness(
      tenantId,
      ctx.canonical_identity || {},
      ctx
    );
  } catch {
    readiness = { enforcement_ready: ctx.force === true, readiness_score: ctx.force ? 0.85 : 0.4 };
  }

  const score = readiness.enforcement_ready
    ? Math.min(1, (readiness.readiness_score ?? 0.75) + 0.1)
    : (readiness.readiness_score ?? 0.35);

  if (flags.isPilotObservabilityEnabled() && score < 0.6) {
    logPhaseZ4('GOVERNANCE_MATURITY_LOW', { tenant_id: tenantId, score, shadow_only: !flags.isPilotMaturityEngineEnabled() });
  }

  return {
    governance_confidence: Number(score.toFixed(4)),
    enforcement_ready: readiness.enforcement_ready === true,
    tenant_profile: readiness
  };
}

module.exports = { assessGovernanceMaturity };
