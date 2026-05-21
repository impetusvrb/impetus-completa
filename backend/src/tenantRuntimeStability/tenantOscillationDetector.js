'use strict';

const { getSummaryRuntimeMeta } = require('../summaryRuntimeActivation/summaryRuntimeState');

function detectTenantOscillation(tenantId, ctx = {}) {
  const meta = getSummaryRuntimeMeta(tenantId);
  const events = meta.oscillation_events || 0;
  const kpiOsc = ctx.kpi_runtime_stability?.oscillation?.detected === true;

  return {
    oscillating: events > 0 || kpiOsc,
    summary_oscillation_events: events,
    kpi_oscillation: kpiOsc,
    severity: events > 2 || kpiOsc ? 'high' : events > 0 ? 'medium' : 'low'
  };
}

module.exports = { detectTenantOscillation };
