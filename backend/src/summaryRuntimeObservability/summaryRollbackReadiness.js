'use strict';

const { assessSummaryRollbackReadiness } = require('../summaryRuntimeActivation/summaryRuntimeRollbackReadiness');

function getSummaryRollbackObservability(tenantId, ctx = {}) {
  const readiness = assessSummaryRollbackReadiness(tenantId, ctx);
  return { phase: 'Z.9', ...readiness, observability_only: true };
}

module.exports = { getSummaryRollbackObservability };
