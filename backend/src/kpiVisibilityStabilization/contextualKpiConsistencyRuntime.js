'use strict';

const { validateKpiTargeting } = require('../kpiRollout/kpiTargetingValidator');

function assessContextualKpiConsistency(user, kpis = [], ctx = {}) {
  const r = validateKpiTargeting(user, kpis, ctx);
  return {
    consistent: r.valid && r.targeting_precision >= 0.6,
    targeting_precision: r.targeting_precision,
    issues: r.issues || []
  };
}

module.exports = { assessContextualKpiConsistency };
