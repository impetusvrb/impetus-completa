'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');

function assessKpiTargetingReadiness(maturity = {}, kpiSim = {}, ctx = {}) {
  const score = maturity.maturity_score ?? 0;
  const safety = maturity.enforcement_safety ?? 0;
  const hideRatio =
    kpiSim.hide_count && kpiSim.preserve_count
      ? kpiSim.hide_count / (kpiSim.hide_count + kpiSim.preserve_count)
      : 0;
  const readiness = Math.max(
    0,
    Math.min(1, score * 0.5 + safety * 0.35 + (1 - hideRatio) * 0.15)
  );

  return {
    kpi_channel_ready: readiness >= 0.72 && maturity.kpi_channel_ready === true,
    readiness_score: Number(readiness.toFixed(4)),
    recommendation_only: true,
    enforcement_enabled: flags.isKpiEnforcementPreparationEnabled(),
    kpi_filtering_applied: false
  };
}

module.exports = { assessKpiTargetingReadiness };
