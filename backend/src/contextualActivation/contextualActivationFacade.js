'use strict';

const flags = require('./config/phaseZ2FeatureFlags');
const supervisor = require('./tenantContextualEnforcementSupervisor');
const { coordinateTenantVisibility } = require('./tenantVisibilityCoordinator');
const { applyTenantDashboardGovernance } = require('./tenantDashboardGovernanceRuntime');
const { getTenantEnforcementState } = require('./tenantEnforcementState');

function isContextualActivationLayerActive() {
  return (
    flags.isContextualActivationObservabilityEnabled() ||
    flags.isContextualEnforcementActivationEnabled() ||
    flags.isTenantContextualEnforcementEnabled()
  );
}

function getContextualActivationStatus(ctx = {}) {
  return {
    phase: 'Z.2',
    layer: 'contextual-activation',
    activation: flags.isContextualEnforcementActivationEnabled(),
    tenant_enforcement: flags.isTenantContextualEnforcementEnabled(),
    safe_menu: flags.isSafeMenuEnforcementEnabled(),
    observability: flags.isContextualActivationObservabilityEnabled(),
    global_enforcement: false,
    tenant_id: ctx.tenant_id
  };
}

function enrichDashboardWithContextualEnforcement(user, legacyResponse, ctx = {}) {
  if (!isContextualActivationLayerActive() && !ctx.force) {
    return { response: legacyResponse, contextual_enforcement_activation: null };
  }

  let identity = {};
  try {
    identity = require('../operationalIdentity/operationalIdentityFacade').resolveIdentityForUser(user, {
      visible_modules: legacyResponse.visible_modules,
      profile_code: legacyResponse.profile_code
    });
  } catch {
    identity = { canonical_identity: {} };
  }

  const mergedCtx = {
    ...ctx,
    canonical_identity: identity.canonical_identity,
    profile_code: legacyResponse.profile_code,
    visible_modules: legacyResponse.visible_modules
  };

  const visibility = coordinateTenantVisibility(user, legacyResponse, mergedCtx);
  const response = { ...legacyResponse };

  if (visibility.enforcement_applied && visibility.visible_modules_after) {
    response.visible_modules = visibility.visible_modules_after;
  }

  const dashGov = applyTenantDashboardGovernance(response, user, mergedCtx);

  const block = {
    phase: 'Z.2',
    enforcement_applied: visibility.enforcement_applied,
    tenant_id: user?.company_id,
    state: getTenantEnforcementState(user?.company_id),
    visibility,
    dashboard_governance: dashGov,
    graceful_degradation: true,
    auto_remediate: false
  };

  return { response, contextual_enforcement_activation: block };
}

function getContextualActivationReport(user, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  return {
    ok: true,
    status: getContextualActivationStatus({ tenant_id: tenantId }),
    supervision: supervisor.superviseTenantEnforcement(tenantId, user, ctx),
    auto_execute: false
  };
}

module.exports = {
  isContextualActivationLayerActive,
  getContextualActivationStatus,
  enrichDashboardWithContextualEnforcement,
  getContextualActivationReport,
  activateTenantEnforcement: supervisor.activateTenantEnforcement,
  deactivateTenantEnforcement: supervisor.deactivateTenantEnforcement,
  superviseTenantEnforcement: supervisor.superviseTenantEnforcement
};
