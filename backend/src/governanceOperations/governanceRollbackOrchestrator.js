'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { logPhaseJ } = require('./phaseJLogger');
const { transitionTo } = require('./governanceOperationalState');

function orchestrateRollbackReadiness(ctx = {}) {
  let readiness = null;
  try {
    const { assessRollbackReadiness } = require('../governanceActivation/governanceRollbackReadiness');
    readiness = assessRollbackReadiness(ctx);
  } catch {
    readiness = { rollback_ready: false };
  }

  transitionTo('rollback_ready', { source: 'rollback_orchestration', auto: false });

  const plan = {
    scope: ctx.scope || 'phase_f_only',
    tenant_id: ctx.tenant_id || null,
    rollback_ready: readiness.rollback_ready !== false,
    auto_rollback: false,
    immediate_actions: readiness.immediate_actions || [],
    pm2_hint: readiness.pm2_hint
  };

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'rollback_orchestration', ...plan });
  } catch {
    /* optional */
  }

  return { orchestrated: true, auto_executed: false, plan, readiness };
}

function orchestrateRollbackExecution(scope, ctx = {}) {
  if (!ctx.approved_by && !ctx.force) {
    return {
      orchestrated: true,
      executed: false,
      reason: 'manual_approval_required',
      auto_executed: false
    };
  }

  let result = null;
  try {
    const { rollbackRollout } = require('../governanceActivation/governanceActivationRolloutEngine');
    result = rollbackRollout(scope, ctx);
  } catch {
    result = { rolled_back: false };
  }

  logPhaseJ('GOVERNANCE_ROLLBACK_ORCHESTRATED', { scope, auto_executed: false });

  return { orchestrated: true, executed: result.rolled_back === true, auto_executed: false, result };
}

module.exports = { orchestrateRollbackReadiness, orchestrateRollbackExecution };
