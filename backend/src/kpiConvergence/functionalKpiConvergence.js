'use strict';

const { validateKpiTargeting } = require('../kpiRollout/kpiTargetingValidator');

function measureFunctionalKpiConvergence(user, kpis = [], ctx = {}) {
  const r = validateKpiTargeting(user, kpis, ctx);
  return {
    converged: r.valid && (r.targeting_precision ?? 0) >= 0.65,
    targeting_precision: r.targeting_precision,
    aligned_count: r.aligned_count,
    issues: r.issues || []
  };
}

module.exports = { measureFunctionalKpiConvergence };
