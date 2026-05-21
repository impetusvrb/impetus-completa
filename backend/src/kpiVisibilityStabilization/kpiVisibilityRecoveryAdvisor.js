'use strict';

const { logPhaseZ6 } = require('../kpiRuntimeStability/phaseZ6Logger');

function adviseKpiVisibilityRecovery(kpis = [], ctx = {}) {
  const recs = [];
  if (kpis.length < 2) recs.push({ action: 'restore_minimum_from_snapshot', priority: 'critical' });
  if (ctx.oscillation?.oscillation_detected) {
    recs.push({ action: 'freeze_kpi_visibility_delta', priority: 'high' });
  }
  if (ctx.critical_underdelivery) {
    recs.push({ action: 'apply_operational_visibility_guarantee', priority: 'critical' });
  }
  if (recs.length) logPhaseZ6('KPI_VISIBILITY_RECOVERY_ADVISED', { count: recs.length, shadow_only: true });
  return { recommendations: recs, auto_remediate: false, auto_correct: false };
}

module.exports = { adviseKpiVisibilityRecovery };
