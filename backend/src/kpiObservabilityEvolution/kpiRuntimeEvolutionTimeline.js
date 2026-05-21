'use strict';

function buildKpiRuntimeEvolutionTimeline(tenantId, ctx = {}) {
  const events = [];
  if (ctx.kpi_enforcement?.enforcement_applied) events.push({ event: 'Z5_ENFORCEMENT', ts: new Date().toISOString() });
  if (ctx.kpi_stability?.stability_applied) events.push({ event: 'Z6_STABILITY', ts: new Date().toISOString() });
  if (ctx.convergence) {
    events.push({ event: 'Z7_CONVERGENCE', score: ctx.convergence.convergence_score, ts: new Date().toISOString() });
  }
  return { tenant_id: tenantId, events };
}

module.exports = { buildKpiRuntimeEvolutionTimeline };
