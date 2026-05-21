'use strict';

const { executeSafeDeploySteps } = require('../controlledActivation/safeProductionDeploy');
const { validateKpiGovernancePostDeploy } = require('../kpiRollout/kpiSafeDeploy');
const { getSummaryRolloutStatus } = require('./summaryGovernanceActivationEngine');

function validateSummaryGovernancePostDeploy() {
  const status = getSummaryRolloutStatus();
  const kpi = validateKpiGovernancePostDeploy();
  return {
    ok: kpi.ok && status.observability === true,
    summary_status: status,
    kpi_governance: kpi
  };
}

function executeSummaryGovernanceDeploy(options = {}) {
  const steps = executeSafeDeploySteps(options).steps;
  const summary = validateSummaryGovernancePostDeploy();
  return { steps, summary_governance_validation: summary, rollback_ready: true };
}

module.exports = { executeSummaryGovernanceDeploy, validateSummaryGovernancePostDeploy };
