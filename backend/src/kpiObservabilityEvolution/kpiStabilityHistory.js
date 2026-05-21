'use strict';

function recordKpiStabilityHistory(stability = {}) {
  return {
    health_score: stability.health?.health_score,
    stability_applied: stability.stability_applied,
    recorded_at: new Date().toISOString()
  };
}

module.exports = { recordKpiStabilityHistory };
