'use strict';

const { balanceDashboardKpiDensity } = require('../kpiDashboardStabilization/dashboardKpiDensityBalancer');

function analyzeCockpitConsistency(kpis = [], ctx = {}) {
  const density = balanceDashboardKpiDensity(kpis, ctx);
  const consistent = !density.sparse && !density.overloaded && kpis.length > 0;
  return { consistent, density, useful: kpis.length >= 2 };
}

module.exports = { analyzeCockpitConsistency };
