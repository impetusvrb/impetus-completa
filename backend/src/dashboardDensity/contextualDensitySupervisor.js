'use strict';

const { analyzeDashboardDensity } = require('./dashboardDensityAnalyzer');
const { simulateOperationalDashboardReduction } = require('./operationalDashboardReducer');
const { simulateExecutiveDashboardReduction } = require('./executiveDashboardReducer');

function superviseContextualDensity(ctx = {}) {
  const analysis = analyzeDashboardDensity(ctx);
  const isExecutive = (ctx.hierarchy_level ?? 3) <= 2;
  const reduction = isExecutive
    ? simulateExecutiveDashboardReduction(ctx, analysis)
    : simulateOperationalDashboardReduction(ctx, analysis);

  return {
    analysis,
    reduction,
    density_governance_ready: analysis.density_score >= 0.6,
    recommendation_only: true,
    auto_apply: false
  };
}

module.exports = { superviseContextualDensity };
