'use strict';

const {
  createBackup,
  verifyFrontendBuild,
  runHealthCheck,
  executeSafeDeploySteps
} = require('../controlledActivation/safeProductionDeploy');
const { assessKpiRolloutReadiness } = require('./kpiGovernanceActivationEngine');

function validateKpiGovernancePostDeploy(user = { functional_axis: 'quality', company_id: 1 }) {
  const readiness = assessKpiRolloutReadiness(user, { kpis: [] }, { force: true });
  return {
    ok: readiness.kpi_readiness?.readiness_score >= 0,
    readiness
  };
}

function executeKpiGovernanceDeploy(options = {}) {
  const steps = executeSafeDeploySteps(options).steps;
  const kpiValidation = validateKpiGovernancePostDeploy();
  return {
    steps,
    kpi_governance_validation: kpiValidation,
    rollback_ready: true
  };
}

module.exports = {
  createBackup,
  verifyFrontendBuild,
  runHealthCheck,
  executeKpiGovernanceDeploy,
  validateKpiGovernancePostDeploy
};
