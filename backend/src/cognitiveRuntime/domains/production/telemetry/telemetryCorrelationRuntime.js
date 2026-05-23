'use strict';

function correlateProductionDomains(signalBundle = {}) {
  const op = signalBundle.operational || {};
  return {
    quality_internal: {
      nc_open: op.quality_nc_open ?? 0,
      correlation_strength: op.quality_nc_open > 0 && op.scrap_qty > 0 ? 'medium' : 'low',
      visible_in_cockpit: false
    },
    maintenance_internal: {
      open_orders: op.maintenance_open ?? 0,
      downtime_correlation: op.downtime_proxy > 0 ? 'medium' : 'low',
      visible_in_cockpit: false
    },
    energy_internal: { proxy: op.energy_proxy, visible_in_cockpit: false },
    safety_internal: { cross_leak: false },
    pcp_internal: { bottleneck: signalBundle.bottlenecks?.primary_line || null }
  };
}

module.exports = { correlateProductionDomains };
