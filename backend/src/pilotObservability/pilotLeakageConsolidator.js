'use strict';

function consolidatePilotLeakage(ctx = {}) {
  const integrity = ctx.integrity || ctx.maturity?.integrity || {};
  const kpiPrep = ctx.kpi_preparation || {};
  return {
    menu_leakage: integrity.leakage || [],
    kpi_leakage_simulated: kpiPrep.leakage_detected || false,
    kpi_would_hide: kpiPrep.visibility_simulation?.would_hide || [],
    consolidated_at: new Date().toISOString()
  };
}

module.exports = { consolidatePilotLeakage };
