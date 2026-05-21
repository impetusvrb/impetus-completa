'use strict';

const flags = require('./config/phaseZ3FeatureFlags');
const { logPhaseZ3 } = require('./phaseZ3Logger');
const { isPilotTenant } = require('./pilotTenantRegistry');

function assessPilotTenantReadiness(tenantId, user = {}, ctx = {}) {
  if (!isPilotTenant(tenantId)) {
    return { pilot: false, enforcement_ready: false, reason: 'not_registered_pilot' };
  }

  let tenantProfile = { enforcement_ready: false };
  let prep = { visibility: { readiness_score: 0 } };
  try {
    tenantProfile = require('../tenantProfiling/tenantProfileFacade').assessTenantDeliveryReadiness(
      tenantId,
      ctx.canonical_identity || {},
      ctx
    );
    prep = require('../contextualEnforcement/contextualEnforcementFacade').prepareContextualEnforcement(user, ctx);
  } catch {
    tenantProfile = { enforcement_ready: ctx.force === true };
  }

  const ready =
    tenantProfile.enforcement_ready &&
    (prep.visibility?.readiness_score >= 0.75 || ctx.force === true);

  if (!ready && flags.isPilotRuntimeObservabilityEnabled()) {
    logPhaseZ3('PILOT_TENANT_NOT_READY', { tenant_id: tenantId, shadow_only: true });
  }

  return {
    pilot: true,
    tenant_id: tenantId,
    enforcement_ready: ready,
    tenant_profile: tenantProfile,
    contextual_preparation: prep.visibility,
    menu_only: true
  };
}

module.exports = { assessPilotTenantReadiness };
