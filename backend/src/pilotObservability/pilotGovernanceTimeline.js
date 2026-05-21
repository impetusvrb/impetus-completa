'use strict';

function buildPilotGovernanceTimeline(tenantId, ctx = {}) {
  const events = [];
  if (ctx.pilot_activation) events.push({ ts: ctx.pilot_activation, event: 'PILOT_MENU_ACTIVATED' });
  if (ctx.maturity_score != null) {
    events.push({ ts: new Date().toISOString(), event: 'MATURITY_ASSESSED', score: ctx.maturity_score });
  }
  if (ctx.kpi_channel_ready) {
    events.push({ ts: new Date().toISOString(), event: 'KPI_CHANNEL_READY_SIGNAL', ready: true });
  }
  return { tenant_id: tenantId, events, recommendation_only: true };
}

module.exports = { buildPilotGovernanceTimeline };
