'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { logPhaseJ } = require('./phaseJLogger');

function _transitionTo(state, meta) {
  const { transitionTo } = require('./governanceOperationalState');
  return transitionTo(state, meta);
}
const { prepareEmergencyRollback } = require('./governanceEmergencyRollback');
const { prepareEmergencyIsolation } = require('./governanceEmergencyIsolation');

/**
 * Controles de emergência — apenas preparação; sem execução automática.
 */
function prepareEmergency(ctx = {}) {
  if (!phaseJ.isGovernanceEmergencyControlsEnabled() && !ctx.force) {
    return { prepared: false, reason: 'emergency_controls_off', auto_executed: false };
  }

  const rollbackPlan = prepareEmergencyRollback(ctx);
  const isolationPlan = prepareEmergencyIsolation(ctx);

  _transitionTo('emergency_mode', {
    source: 'emergency_prepare',
    approved_by: ctx.approved_by,
    auto: false
  });

  const package_ = {
    prepared_at: new Date().toISOString(),
    approved_by: ctx.approved_by || null,
    rollback: rollbackPlan,
    isolation: isolationPlan,
    execution: 'manual_only',
    auto_executed: false,
    pm2_flags_off: [
      'IMPETUS_GOVERNANCE_OPERATIONS',
      'IMPETUS_GOVERNANCE_INCIDENT_ENGINE',
      'IMPETUS_GOVERNANCE_RUNTIME_HEALTH',
      'IMPETUS_GOVERNANCE_EMERGENCY_CONTROLS',
      'IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION',
      'IMPETUS_KPI_GOVERNANCE',
      'IMPETUS_SUMMARY_GOVERNANCE',
      'IMPETUS_CHAT_GOVERNANCE',
      'IMPETUS_COGNITIVE_BOUNDARY_GUARD'
    ]
  };

  logPhaseJ('GOVERNANCE_EMERGENCY_PREPARED', {
    approved_by: ctx.approved_by,
    tenant_id: ctx.tenant_id
  });

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'emergency_preparation', ...package_ });
  } catch {
    /* optional */
  }

  return { prepared: true, auto_executed: false, ...package_ };
}

module.exports = { prepareEmergency };
