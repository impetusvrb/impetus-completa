'use strict';

const flags = require('./safetyGovernanceRuntimeFlags');
const { evaluateRiskMatrix, summarizeGheExposure } = require('./risk/safetyRiskMatrixEngine');

function screenRiskMatrix(rows) {
  if (!flags.isSafetyGovernanceRuntimeEnabled()) {
    return { skipped: true, reason: 'governance_off' };
  }
  if (!flags.isSafetyRiskMatrixEnabled()) {
    return { skipped: true, reason: 'risk_matrix_off' };
  }
  return evaluateRiskMatrix(rows);
}

function screenGheSummary(groups) {
  if (!flags.isSafetyGovernanceRuntimeEnabled()) {
    return { skipped: true, reason: 'governance_off' };
  }
  if (!flags.isSafetyGheRuntimeEnabled()) {
    return { skipped: true, reason: 'ghe_off' };
  }
  return summarizeGheExposure(groups);
}

module.exports = {
  screenRiskMatrix,
  screenGheSummary
};
