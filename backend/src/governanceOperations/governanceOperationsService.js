'use strict';

/**
 * Serviço central de operações de governança — Fase J.
 */

const phaseJ = require('./config/phaseJFeatureFlags');
const { getOperationalState } = require('./governanceOperationalState');
const { getLifecycleSnapshot } = require('./governanceLifecycleCoordinator');
const { collectRuntimeSnapshot } = require('./governanceRuntimeCoordinator');
const { listIncidents } = require('./governanceIncidentEngine');
const { computeOperationalMetrics } = require('./governanceOperationalMetrics');
const { computeProductionHealth } = require('./governanceProductionHealth');
const { planRollout } = require('../governanceActivation/governanceActivationRolloutEngine');
const { assessReadiness } = require('../governanceReadiness/governanceReadinessEngine');

function isOperationsLayerActive() {
  return phaseJ.isGovernanceOperationsEnabled();
}

function getOperationsStatus(ctx = {}) {
  if (!isOperationsLayerActive() && !ctx.force) {
    return {
      enabled: false,
      message: 'IMPETUS_GOVERNANCE_OPERATIONS=off',
      shadow_mode_expected: true,
      auto_activation: false
    };
  }

  const readiness = assessReadiness({ force: true });
  const rollout = planRollout(readiness);

  return {
    enabled: true,
    flags: {
      operations: phaseJ.isGovernanceOperationsEnabled(),
      incident_engine: phaseJ.isGovernanceIncidentEngineEnabled(),
      runtime_health: phaseJ.isGovernanceRuntimeHealthEnabled(),
      emergency_controls: phaseJ.isGovernanceEmergencyControlsEnabled()
    },
    operational_state: getOperationalState(),
    lifecycle: getLifecycleSnapshot(),
    runtime: collectRuntimeSnapshot(ctx),
    metrics: computeOperationalMetrics(ctx),
    rollout: { ...rollout, auto_execute: false },
    auto_activation: false,
    auto_rollback: false
  };
}

function getRolloutOperations(ctx = {}) {
  const readiness = assessReadiness({ force: true });
  return {
    ok: true,
    auto_execute: false,
    readiness_score: readiness.readiness_score,
    activation_recommendation: readiness.activation_recommendation,
    ...planRollout(readiness),
    tenant_id: ctx.tenant_id || null
  };
}

function getHealthOperations(ctx = {}) {
  if (!phaseJ.isGovernanceRuntimeHealthEnabled() && !ctx.force) {
    return { enabled: false, monitoring: false };
  }
  return {
    enabled: true,
    ...computeProductionHealth(ctx),
    operational_metrics: computeOperationalMetrics(ctx)
  };
}

module.exports = {
  isOperationsLayerActive,
  getOperationsStatus,
  getRolloutOperations,
  getHealthOperations,
  getIncidents: listIncidents,
  getRuntime: collectRuntimeSnapshot
};
