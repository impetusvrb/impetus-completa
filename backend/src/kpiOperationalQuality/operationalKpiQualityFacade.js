'use strict';

const { analyzeKpiOperationalUsefulness } = require('./kpiOperationalUsefulnessAnalyzer');
const { assessContextualSignalStrength } = require('./contextualSignalStrength');
const { assessDashboardOperationalSignalQuality } = require('./dashboardOperationalSignalQuality');
const { adviseKpiNoiseReduction } = require('./kpiNoiseReductionAdvisor');

function analyzeOperationalKpiQuality(kpis = [], ctx = {}) {
  return {
    usefulness: analyzeKpiOperationalUsefulness(kpis, ctx),
    signal: assessContextualSignalStrength(kpis),
    dashboard_signal: assessDashboardOperationalSignalQuality(kpis),
    noise: adviseKpiNoiseReduction(kpis, ctx),
    recommendation_only: true,
    fabricated: false
  };
}

module.exports = { analyzeOperationalKpiQuality };
