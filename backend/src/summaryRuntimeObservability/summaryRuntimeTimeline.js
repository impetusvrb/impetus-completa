'use strict';

const { getSummaryRuntimeMeta } = require('../summaryRuntimeActivation/summaryRuntimeState');

function buildSummaryRuntimeTimeline(tenantId, pack = {}) {
  const meta = getSummaryRuntimeMeta(tenantId);
  return {
    tenant_id: tenantId,
    events: [
      { at: meta.activated_at, type: 'summary_activation', active: meta.summary_activation_active },
      { at: new Date().toISOString(), type: 'observation', oscillation: pack.stability?.oscillation?.events }
    ].filter((e) => e.at),
    phase: 'Z.9'
  };
}

module.exports = { buildSummaryRuntimeTimeline };
