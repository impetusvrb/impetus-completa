'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { logPhaseJ } = require('./phaseJLogger');

function collectRuntimeSnapshot(ctx = {}) {
  const snapshot = {
    collected_at: new Date().toISOString(),
    tenant_id: ctx.tenant_id || null
  };

  try {
    const { getRuntimeState, resolveChannelActivation } = require('../governanceActivation/governanceActivationRuntime');
    snapshot.activation = getRuntimeState();
    snapshot.channels = ['kpi', 'summary', 'chat', 'boundary'].map((ch) => ({
      channel: ch,
      ...resolveChannelActivation(ch, ctx)
    }));
  } catch {
    snapshot.activation = null;
  }

  try {
    const { getHealthIfMonitoring } = require('../governanceActivation/governanceRuntimeHealth');
    snapshot.phase_i_health = getHealthIfMonitoring();
  } catch {
    snapshot.phase_i_health = null;
  }

  if (phaseJ.isGovernanceRuntimeHealthEnabled()) {
    try {
      const { computeProductionHealth } = require('./governanceProductionHealth');
      snapshot.production_health = computeProductionHealth(ctx);
    } catch {
      snapshot.production_health = null;
    }
  }

  return snapshot;
}

function escalateRuntime(signal = {}) {
  if (!phaseJ.isGovernanceOperationsEnabled()) {
    return { escalated: false, reason: 'operations_off' };
  }
  logPhaseJ('GOVERNANCE_RUNTIME_ESCALATED', signal);
  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'runtime_escalation', ...signal });
  } catch {
    /* optional */
  }
  return { escalated: true, auto_remediation: false, signal };
}

module.exports = { collectRuntimeSnapshot, escalateRuntime };
