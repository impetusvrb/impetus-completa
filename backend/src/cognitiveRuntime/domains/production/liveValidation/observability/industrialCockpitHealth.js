'use strict';

function buildIndustrialCockpitHealth(liveValidation = {}) {
  const lv = liveValidation.production_live_validation || liveValidation;
  const score =
    (lv.telemetry_ready ? 0.2 : 0) +
    (lv.runtime_stable ? 0.2 : 0) +
    (lv.density_safe ? 0.15 : 0) +
    (lv.cross_domain_clean ? 0.15 : 0) +
    (lv.performance_safe ? 0.15 : 0) +
    (lv.summary_semantic_valid ? 0.15 : 0);
  return {
    industrial_cockpit_health: {
      score: Math.round(score * 100) / 100,
      healthy: score >= 0.75,
      overload: lv.overload_detected === true
    }
  };
}

module.exports = { buildIndustrialCockpitHealth };
