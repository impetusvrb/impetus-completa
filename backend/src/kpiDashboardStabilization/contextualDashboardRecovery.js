'use strict';

const { logPhaseZ6 } = require('../kpiRuntimeStability/phaseZ6Logger');

function adviseContextualDashboardRecovery(kpis = [], ctx = {}) {
  const recs = [];
  if (!kpis.length) recs.push({ action: 'restore_from_kpi_snapshot', priority: 'critical' });
  if (ctx.density?.sparse) recs.push({ action: 'review_minimum_guarantee', priority: 'medium' });
  if (recs.length) logPhaseZ6('DASHBOARD_KPI_RECOVERY_ADVISED', { count: recs.length, shadow_only: true });
  return { recommendations: recs, auto_remediate: false };
}

module.exports = { adviseContextualDashboardRecovery };
