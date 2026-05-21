'use strict';

function buildKpiDeliveryTimeline(tenantId, pack = {}) {
  const events = [];
  if (pack.pipeline?.enforcement_applied) {
    events.push({
      ts: new Date().toISOString(),
      event: 'KPI_ENFORCEMENT_APPLIED',
      before: pack.pipeline.before_count,
      after: pack.pipeline.after_count
    });
  }
  if (pack.activation) {
    events.push({ ts: pack.activation.activated_at, event: 'KPI_CHANNEL_ACTIVATED', tenant_id: tenantId });
  }
  return { tenant_id: tenantId, events };
}

module.exports = { buildKpiDeliveryTimeline };
