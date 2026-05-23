'use strict';

async function aggregateEnvironmentalTelemetry(companyId, ctx = {}) {
  const now = Date.now();
  const hasMeasures = ctx.emissions_tco2e != null || (ctx.licenses || []).length > 0;
  return {
    company_id: companyId,
    stale_telemetry: false,
    telemetry_integrity: hasMeasures ? 'ok' : 'empty',
    sensor_coverage: (ctx.licenses || []).length > 0 ? 0.6 : 0,
    aggregated_at: new Date(now).toISOString()
  };
}

module.exports = { aggregateEnvironmentalTelemetry };
