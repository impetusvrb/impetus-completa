'use strict';

const { validateKpiTargeting } = require('../kpiRollout/kpiTargetingValidator');

function validateKpiContextualAuthority(user, kpis = [], ctx = {}) {
  const result = validateKpiTargeting(user, kpis, ctx);
  return {
    valid: result.valid,
    authority_aligned: result.aligned_count,
    issues: result.issues,
    simulation_only: true
  };
}

module.exports = { validateKpiContextualAuthority };
