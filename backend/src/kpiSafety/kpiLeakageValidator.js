'use strict';

const { simulateKpiVisibility } = require('../kpiEnforcementPreparation/kpiVisibilityPreparation');

function validateKpiLeakage(kpis = [], ctx = {}) {
  const sim = simulateKpiVisibility(kpis, ctx);
  return {
    leakage_detected: sim.would_hide.length > 0,
    would_hide: sim.would_hide,
    leakage_count: sim.hide_count
  };
}

module.exports = { validateKpiLeakage };
