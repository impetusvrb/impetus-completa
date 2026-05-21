'use strict';

function balanceDashboardKpiDensity(kpis = [], ctx = {}) {
  const count = kpis.length;
  const ideal = ctx.ideal_density ?? 6;
  return {
    count,
    sparse: count > 0 && count < 3,
    overloaded: count > ideal * 1.5,
    density_score: count === 0 ? 0 : Math.min(1, count / ideal)
  };
}

module.exports = { balanceDashboardKpiDensity };
