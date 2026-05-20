'use strict';

const { logPhaseJ } = require('./phaseJLogger');

function prepareEmergencyRollback(ctx = {}) {
  let readiness = { rollback_ready: true, auto_rollback: false };
  try {
    const { assessRollbackReadiness } = require('../governanceActivation/governanceRollbackReadiness');
    readiness = assessRollbackReadiness({ scope: ctx.scope || 'all', tenant_id: ctx.tenant_id });
  } catch {
    /* fallback */
  }

  const plan = {
    type: 'emergency_rollback',
    auto_executed: false,
    steps: [
      { action: 'POST', path: '/api/internal/governance/activation/rollback-rollout', body: { scope: 'phase_f_only' } },
      { action: 'env', flags: 'IMPETUS_*_GOVERNANCE=off' },
      { action: 'pm2', command: 'pm2 reload impetus-backend --update-env' }
    ],
    readiness,
    requires_approval: true
  };

  logPhaseJ('GOVERNANCE_EMERGENCY_ROLLBACK_PREPARED', { tenant_id: ctx.tenant_id });

  return plan;
}

module.exports = { prepareEmergencyRollback };
