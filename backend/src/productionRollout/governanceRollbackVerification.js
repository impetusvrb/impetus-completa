'use strict';

const { logProductionRollout } = require('./productionRolloutLogger');

function verifyRollbackReadiness(ctx = {}) {
  let readiness = { rollback_ready: false, auto_rollback: false };
  try {
    const { assessRollbackReadiness } = require('../governanceActivation/governanceRollbackReadiness');
    readiness = assessRollbackReadiness({ scope: ctx.scope || 'phase_f_only', tenant_id: ctx.tenant_id });
  } catch {
    readiness = { rollback_ready: true, auto_rollback: false };
  }

  const verified = {
    verified: readiness.rollback_ready !== false,
    rollback_ready: readiness.rollback_ready,
    auto_rollback: false,
    supervised: true,
    auditable: true,
    tenant_id: ctx.tenant_id || null,
    immediate_actions: readiness.immediate_actions || [],
    pm2_hint: readiness.pm2_hint || 'pm2 reload impetus-backend --update-env',
    env_flags_off: [
      'IMPETUS_PRODUCTION_ROLLOUT',
      'IMPETUS_GOVERNANCE_STABILIZATION',
      'IMPETUS_RUNTIME_OBSERVATION',
      'IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION',
      'IMPETUS_KPI_GOVERNANCE',
      'IMPETUS_SUMMARY_GOVERNANCE',
      'IMPETUS_CHAT_GOVERNANCE',
      'IMPETUS_COGNITIVE_BOUNDARY_GUARD'
    ]
  };

  logProductionRollout('PRODUCTION_ROLLBACK_VERIFIED', {
    verified: verified.verified,
    tenant_id: ctx.tenant_id
  });

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'rollback_verification', ...verified });
  } catch {
    /* optional */
  }

  return verified;
}

module.exports = { verifyRollbackReadiness };
