'use strict';

const { measureFunctionalKpiConvergence } = require('../kpiConvergence/functionalKpiConvergence');

function assessFunctionalDashboardIntegrity(user, kpis = [], ctx = {}) {
  const f = measureFunctionalKpiConvergence(user, kpis, ctx);
  return { integrity: f.targeting_precision, valid: f.converged };
}

module.exports = { assessFunctionalDashboardIntegrity };
