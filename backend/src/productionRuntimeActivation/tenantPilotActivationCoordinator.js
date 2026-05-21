'use strict';

const flags = require('./config/phaseZ12FeatureFlags');
const { logPhaseZ12 } = require('./phaseZ12Logger');
const { validateRuntimeActivationSafety } = require('./runtimeActivationSafetyValidator');
const { protectRolloutActivation } = require('./rolloutActivationProtection');

function coordinatePilotProductionActivation(tenantId, user, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return {
      activated: false,
      prepared: true,
      reason: 'execute_and_approved_by_required',
      auto_execute: false
    };
  }
  if (!flags.isProductionRuntimeActivationEnabled() && !ctx.force) {
    return {
      activated: false,
      reason: 'IMPETUS_PRODUCTION_RUNTIME_ACTIVATION=off',
      recommendation_only: true
    };
  }

  const safety = validateRuntimeActivationSafety(tenantId, ctx);
  let safetyPack = {};
  let governance_entropy = {};
  try {
    safetyPack = require('../runtimeActivationSafety/activationSafetyFacade').assessActivationSafety(
      tenantId,
      user,
      ctx
    );
    const z11 = require('../runtimeOperationalScaling/runtimeOperationalScalingFacade').applyRuntimeOperationalScaling(
      user,
      {},
      { tenant_id: tenantId, force_scaling: ctx.force }
    );
    governance_entropy = z11.governance_load_protection?.entropy || {};
  } catch {
    safetyPack = {};
  }

  const protection = protectRolloutActivation({
    ...safetyPack,
    validator: safety,
    governance_entropy
  });
  if (!protection.activation_allowed && !ctx.force) {
    return {
      activated: false,
      reason: 'activation_protection_blocked',
      safety,
      protection,
      flow: ['readiness', 'safety', 'protect']
    };
  }

  if (ctx.simulate_only === true) {
    return { activated: false, simulated: true, safety, protection };
  }

  const results = { kpi: null, summary: null };

  if (ctx.activate_kpi !== false) {
    results.kpi = require('../kpiRuntimeEnforcement/tenantKpiActivationCoordinator').coordinateTenantKpiActivation(
      tenantId,
      user,
      { ...ctx, execute: true, approved_by: ctx.approved_by }
    );
  }

  if (ctx.activate_summary === true) {
    results.summary = require('../summaryRuntimeActivation/summaryActivationCoordinator').coordinateTenantSummaryActivation(
      tenantId,
      user,
      { ...ctx, execute: true, approved_by: ctx.approved_by, summary_before: ctx.summary_before }
    );
  }

  const activated = results.kpi?.activated || results.summary?.activated;

  if (activated) {
    logPhaseZ12('PRODUCTION_PILOT_ACTIVATION', {
      tenant_id: tenantId,
      approved_by: ctx.approved_by,
      kpi: results.kpi?.activated,
      summary: results.summary?.activated
    });
  }

  return {
    activated: !!activated,
    tenant_id: tenantId,
    supervised: true,
    results,
    safety,
    protection,
    auto_execute: false,
    chat_blocked: true
  };
}

module.exports = { coordinatePilotProductionActivation };
