'use strict';

const flags = require('./config/phaseZ2FeatureFlags');
const { logPhaseZ2 } = require('./phaseZ2Logger');
const {
  getTenantEnforcementState,
  setTenantEnforcementActive,
  setTenantEnforcementChannel
} = require('./tenantEnforcementState');
const { assessTenantEnforcementRollbackReadiness } = require('./tenantEnforcementRollbackReadiness');

const PROGRESSIVE_CHANNELS = ['menu', 'dashboard', 'kpi', 'summary'];

function canActivateTenantEnforcement(tenantId, user, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { allowed: false, reason: 'execute_and_approved_by_required', prepared: true };
  }
  if (!flags.isContextualEnforcementActivationEnabled() && !ctx.force_activation) {
    return { allowed: false, reason: 'IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION=off' };
  }

  let prep = null;
  try {
    prep = require('../contextualEnforcement/contextualEnforcementFacade').prepareContextualEnforcement(user, {
      ...ctx,
      tenant_id: tenantId,
      visible_modules: ctx.visible_modules
    });
  } catch (e) {
    return { allowed: false, reason: 'preparation_failed', error: e.message };
  }

  if (!prep.tenant_readiness?.enforcement_ready && !ctx.force_activation) {
    return {
      allowed: false,
      reason: 'tenant_not_ready',
      tenant_readiness: prep.tenant_readiness,
      visibility: prep.visibility
    };
  }
  if (!prep.visibility?.enforcement_ready && prep.visibility?.readiness_score < 0.75 && !ctx.force_activation) {
    return {
      allowed: false,
      reason: 'visibility_readiness_low',
      readiness_score: prep.visibility?.readiness_score
    };
  }

  return { allowed: true, preparation: prep };
}

function activateTenantEnforcement(tenantId, user, ctx = {}) {
  const check = canActivateTenantEnforcement(tenantId, user, ctx);
  if (!check.allowed) {
    logPhaseZ2('TENANT_ENFORCEMENT_BLOCKED', { tenant_id: tenantId, reason: check.reason, shadow_only: true });
    return { activated: false, ...check, auto_execute: false };
  }

  const channel = ctx.channel || 'menu';
  const state = setTenantEnforcementActive(tenantId, true, {
    approved_by: ctx.approved_by,
    channels: { [channel]: true, ...(ctx.channels || {}) }
  });
  if (PROGRESSIVE_CHANNELS.includes(channel)) {
    setTenantEnforcementChannel(tenantId, channel, true);
  }
  state.progressive_step = PROGRESSIVE_CHANNELS.filter((c) => state.channels[c]).length;

  logPhaseZ2('TENANT_CONTEXTUAL_ENFORCEMENT_ACTIVATED', {
    tenant_id: tenantId,
    channel,
    approved_by: ctx.approved_by,
    step: state.progressive_step
  });

  return {
    activated: true,
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    channel,
    state,
    rollback: assessTenantEnforcementRollbackReadiness(tenantId, ctx),
    preparation: check.preparation,
    progressive: true,
    auto_execute: false
  };
}

function deactivateTenantEnforcement(tenantId, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { deactivated: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  setTenantEnforcementActive(tenantId, false, { approved_by: ctx.approved_by });
  logPhaseZ2('TENANT_CONTEXTUAL_ENFORCEMENT_DEACTIVATED', { tenant_id: tenantId, approved_by: ctx.approved_by });
  return {
    deactivated: true,
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    graceful_restore: true,
    auto_execute: false
  };
}

function superviseTenantEnforcement(tenantId, user, ctx = {}) {
  const state = getTenantEnforcementState(tenantId);
  const rollback = assessTenantEnforcementRollbackReadiness(tenantId, ctx);
  let readiness = { enforcement_ready: false };
  try {
    const prep = require('../contextualEnforcement/contextualEnforcementFacade').prepareContextualEnforcement(user, ctx);
    readiness = prep.visibility;
  } catch {
    /* optional */
  }

  return {
    tenant_id: tenantId,
    state,
    rollback,
    readiness,
    progressive_channels: PROGRESSIVE_CHANNELS,
    next_channel: PROGRESSIVE_CHANNELS.find((c) => !state.channels[c]) || null,
    enforcement_globally_enabled: flags.isContextualEnforcementActivationEnabled()
  };
}

module.exports = {
  PROGRESSIVE_CHANNELS,
  canActivateTenantEnforcement,
  activateTenantEnforcement,
  deactivateTenantEnforcement,
  superviseTenantEnforcement
};
