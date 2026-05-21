'use strict';

const { validateKpiAuthorityConflictValidator } = require('../kpiSafety/kpiAuthorityConflictValidator');

function runKpiAuthorityConsistency(user, kpis = [], ctx = {}) {
  const r = validateKpiAuthorityConflictValidator(user, kpis, ctx);
  return { consistent: r.valid, conflicts: r.conflicts };
}

module.exports = { runKpiAuthorityConsistency };
