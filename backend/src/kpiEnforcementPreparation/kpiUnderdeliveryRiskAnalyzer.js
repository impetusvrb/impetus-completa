'use strict';

const { logPhaseZ4 } = require('../pilotMaturity/phaseZ4Logger');

const TIER_MIN_KPI = {
  executive: 2,
  director: 2,
  coordination: 3,
  supervisor: 3,
  operational: 4,
  staff: 3
};

function analyzeKpiUnderdeliveryRisk(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  const min = TIER_MIN_KPI[tier] ?? 3;
  const count = Array.isArray(kpis) ? kpis.length : 0;
  const afterSimHide = ctx.simulated_visible_count ?? count;
  const risk = afterSimHide < min;

  if (risk) {
    logPhaseZ4('KPI_UNDERDELIVERY_SIMULATED', {
      tier,
      visible: afterSimHide,
      minimum: min,
      shadow_only: true
    });
  }

  return {
    underdelivery_risk: risk,
    minimum_required: min,
    visible_after_simulation: afterSimHide,
    critical: afterSimHide < Math.max(1, min - 2),
    simulation_only: true
  };
}

module.exports = { analyzeKpiUnderdeliveryRisk };
