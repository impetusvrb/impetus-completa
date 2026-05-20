'use strict';

const flags = require('./config/tenantRolloutFeatureFlags');
const supervisor = require('./tenantRolloutSupervisor');
const { measureTenantGovernanceHealth } = require('./tenantGovernanceHealth');
const { observeTenantRuntime } = require('./tenantRuntimeObservation');
const { getTenantRolloutTelemetry } = require('./tenantRolloutTelemetry');

function isTenantRolloutLayerActive() {
  return (
    flags.isTenantRolloutObservabilityEnabled() ||
    flags.isTenantCognitiveRolloutEnabled() ||
    flags.isTenantRolloutActivationEnabled()
  );
}

function getTenantRolloutReport(tenantId, user, ctx = {}) {
  const supervision = supervisor.superviseTenantRollout(tenantId, user, ctx);
  return {
    ok: true,
    status: supervisor.getTenantRolloutStatus(),
    supervision,
    telemetry: getTenantRolloutTelemetry(),
    auto_activation: false,
    auto_rollback: false
  };
}

module.exports = {
  isTenantRolloutLayerActive,
  getTenantRolloutStatus: supervisor.getTenantRolloutStatus,
  superviseTenantRollout: supervisor.superviseTenantRollout,
  activateTenantRollout: supervisor.activateTenantRollout,
  deactivateTenantRollout: supervisor.deactivateTenantRollout,
  measureTenantGovernanceHealth,
  observeTenantRuntime,
  getTenantRolloutReport
};
