'use strict';

const { validateKpiTargeting } = require('../kpiRollout/kpiTargetingValidator');

function hardenFunctionalKpiTargeting(user, kpis = [], ctx = {}) {
  const r = validateKpiTargeting(user, kpis, ctx);
  return { hardened: r.valid, targeting_precision: r.targeting_precision, issues: r.issues };
}

module.exports = { hardenFunctionalKpiTargeting };
