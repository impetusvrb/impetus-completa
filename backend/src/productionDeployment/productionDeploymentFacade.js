'use strict';

const flags = require('./config/productionDeploymentFeatureFlags');
const orchestrator = require('./productionDeploymentOrchestrator');
const { validateRuntimeDeployment } = require('./runtimeDeploymentValidator');
const { superviseDeploymentRollback } = require('./deploymentRollbackSupervisor');
const { consolidateDeploymentHealth } = require('./deploymentHealthConsolidator');
const { getDeploymentTelemetry } = require('./productionDeploymentTelemetry');

function isProductionDeploymentLayerActive() {
  return (
    flags.isDeploymentObservabilityEnabled() ||
    flags.isProductionDeploymentEnabled() ||
    flags.isDeploymentValidationEnabled() ||
    flags.isSafeReloadCoordinationEnabled()
  );
}

function getDeploymentReport(ctx = {}) {
  const readiness = orchestrator.assessDeploymentReadiness(ctx);
  return {
    ok: true,
    status: orchestrator.getProductionDeploymentStatus(),
    readiness,
    runtime: validateRuntimeDeployment(ctx),
    rollback: readiness.rollback,
    health: readiness.health,
    telemetry: getDeploymentTelemetry(),
    auto_deploy: false,
    auto_rollback: false
  };
}

module.exports = {
  isProductionDeploymentLayerActive,
  getProductionDeploymentStatus: orchestrator.getProductionDeploymentStatus,
  assessDeploymentReadiness: orchestrator.assessDeploymentReadiness,
  orchestrateProductionDeploy: orchestrator.orchestrateProductionDeploy,
  validateRuntimeDeployment,
  superviseDeploymentRollback,
  consolidateDeploymentHealth,
  getDeploymentReport
};
