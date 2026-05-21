'use strict';

const { validateKpiTargeting } = require('../kpiRollout/kpiTargetingValidator');

function assessKpiFunctionalConsistency(user, kpis = [], ctx = {}) {
  const r = validateKpiTargeting(user, kpis, ctx);
  return {
    consistent: r.valid,
    targeting_precision: r.targeting_precision,
    issues: r.issues
  };
}

module.exports = { assessKpiFunctionalConsistency };
