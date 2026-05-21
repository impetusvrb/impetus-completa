'use strict';

function balanceDashboardDensity(ctx = {}) {
  let analysis = { density_score: 0.8 };
  try {
    analysis = require('../dashboardDensity/dashboardDensityAnalyzer').analyzeDashboardDensity(ctx);
  } catch {
    analysis = { density_score: 0.8 };
  }
  return {
    density_score: analysis.density_score,
    balance_recommendation: analysis.density_score < 0.55 ? 'reduce_widgets' : 'maintain',
    applied: false
  };
}

module.exports = { balanceDashboardDensity };
