'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { logPhaseJ } = require('./phaseJLogger');
const { getOperationalState, transitionTo, syncFromRuntime } = require('./governanceOperationalState');

const LIFECYCLE_PHASES = [
  'foundation',
  'shadow_observation',
  'readiness_assessment',
  'controlled_activation',
  'stabilization',
  'operations'
];

function getLifecycleSnapshot() {
  let readiness = null;
  let activation = null;
  try {
    const { assessReadiness } = require('../governanceReadiness/governanceReadinessEngine');
    readiness = assessReadiness({ force: true });
  } catch {
    readiness = null;
  }
  try {
    const { getRuntimeState } = require('../governanceActivation/governanceActivationRuntime');
    activation = getRuntimeState();
  } catch {
    activation = null;
  }

  const operational = getOperationalState();
  if (phaseJ.isGovernanceOperationsEnabled() && activation) {
    syncFromRuntime({
      ...activation,
      controlled_framework: activation.controlled_framework,
      degraded: operational.state === 'degraded'
    });
  }

  return {
    phases: LIFECYCLE_PHASES,
    current_phase: 'operations',
    operational_state: getOperationalState(),
    readiness_summary: readiness
      ? {
          readiness_score: readiness.readiness_score,
          activation_recommendation: readiness.activation_recommendation,
          auto_activation: false
        }
      : null,
    activation_runtime: activation,
    auto_progression: false
  };
}

function recordLifecycleEvent(eventType, payload = {}) {
  logPhaseJ('GOVERNANCE_LIFECYCLE_EVENT', { event_type: eventType, ...payload });
  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'lifecycle', event_type: eventType, ...payload });
  } catch {
    /* optional */
  }
  return { recorded: true, event_type: eventType };
}

function prepareStabilization(ctx = {}) {
  if (!phaseJ.isGovernanceOperationsEnabled()) {
    return { prepared: false, reason: 'governance_operations_off' };
  }
  const result = transitionTo('stabilized', {
    source: 'manual_stabilization',
    approved_by: ctx.approved_by,
    auto: false
  });
  recordLifecycleEvent('stabilization_prepared', ctx);
  return { prepared: true, auto_executed: false, ...result };
}

module.exports = {
  LIFECYCLE_PHASES,
  getLifecycleSnapshot,
  recordLifecycleEvent,
  prepareStabilization
};
