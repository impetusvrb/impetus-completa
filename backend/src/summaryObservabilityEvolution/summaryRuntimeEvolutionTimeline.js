'use strict';

function buildSummaryRuntimeEvolutionTimeline(tenantId, ctx = {}) {
  const events = [];
  if (ctx.kpi_convergence) events.push({ event: 'Z7_KPI_CONVERGENCE', ts: new Date().toISOString() });
  if (ctx.convergence) events.push({ event: 'Z8_SUMMARY_CONVERGENCE', score: ctx.convergence.convergence_score, ts: new Date().toISOString() });
  return { tenant_id: tenantId, events };
}

module.exports = { buildSummaryRuntimeEvolutionTimeline };
