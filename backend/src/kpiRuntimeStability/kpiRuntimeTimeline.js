'use strict';

function buildKpiRuntimeTimeline(tenantId, pack = {}) {
  const events = [];
  if (pack.enforcement?.enforcement_applied) {
    events.push({
      ts: new Date().toISOString(),
      event: 'KPI_ENFORCEMENT_ACTIVE',
      before: pack.enforcement.pipeline?.before_count,
      after: pack.enforcement.pipeline?.after_count
    });
  }
  if (pack.stability_applied) {
    events.push({ ts: new Date().toISOString(), event: 'KPI_RUNTIME_STABILITY_ASSESSED', tenant_id: tenantId });
  }
  return { tenant_id: tenantId, events };
}

module.exports = { buildKpiRuntimeTimeline };
