'use strict';

const { executeKpiStabilizationDeploy, validateKpiGovernancePostDeploy } = require('../kpiRollout/kpiSafeDeploy');
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
  const base = executeKpiStabilizationDeploy(options);
  const summary = validateSummaryGovernancePostDeploy();
  return { ...base, summary_governance_validation: summary, rollback_ready: true };
}

module.exports = { executeSummaryGovernanceDeploy, validateSummaryGovernancePostDeploy };
