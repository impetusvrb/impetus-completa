'use strict';

const { executeKpiGovernanceDeploy, validateKpiGovernancePostDeploy } = require('../kpiRollout/kpiSafeDeploy');
const { getKpiStabilizationStatus } = require('./kpiStabilizationFacade');

function validateKpiStabilizationPostDeploy() {
  const status = getKpiStabilizationStatus();
  const gov = validateKpiGovernancePostDeploy();
  return {
    ok: gov.ok && status.observability === true,
    stabilization_status: status,
    kpi_governance: gov
  };
}

function executeKpiStabilizationDeploy(options = {}) {
  const base = executeKpiGovernanceDeploy(options);
  const stabilization = validateKpiStabilizationPostDeploy();
  return {
    ...base,
    kpi_stabilization_validation: stabilization,
    rollback_ready: true
  };
}

module.exports = {
  executeKpiStabilizationDeploy,
  validateKpiStabilizationPostDeploy
};
