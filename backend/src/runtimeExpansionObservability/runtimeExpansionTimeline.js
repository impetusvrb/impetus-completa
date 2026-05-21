'use strict';

function buildRuntimeExpansionTimeline(tenantId, pack = {}) {
  const events = [];
  if (pack.expansion?.expansion_maturity_score != null) {
    events.push({
      at: new Date().toISOString(),
      type: 'expansion_maturity_observed',
      score: pack.expansion.expansion_maturity_score
    });
  }
  if (pack.scaling?.scaling_instability_detected) {
    events.push({ at: new Date().toISOString(), type: 'scaling_instability', tenant_id: tenantId });
  }
  return { tenant_id: tenantId, events, phase: 'Z.11' };
}

module.exports = { buildRuntimeExpansionTimeline };
