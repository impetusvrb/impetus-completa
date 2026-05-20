'use strict';

const { logProductionRollout } = require('./productionRolloutLogger');

/**
 * Plano de reload PM2 — nunca executa automaticamente.
 */
function planPm2Reload(ctx = {}) {
  const sequence = [
    { step: 1, action: 'verify_env_flags', flags: ctx.flags || ['IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION'] },
    { step: 2, action: 'backup_current_env', note: 'document current .env / PM2 ecosystem' },
    { step: 3, action: 'pm2_reload', command: 'pm2 reload impetus-backend --update-env', auto: false },
    { step: 4, action: 'health_check', endpoints: ['/api/health', '/api/internal/governance/production/status'] },
    { step: 5, action: 'observe_shadow', days: 7 }
  ];

  logProductionRollout('PRODUCTION_RELOAD_PLANNED', { steps: sequence.length });

  return {
    planned: true,
    auto_executed: false,
    sequence,
    rebuild_required: false,
    requires_approval: true,
    approved_by: ctx.approved_by || null
  };
}

module.exports = { planPm2Reload };
