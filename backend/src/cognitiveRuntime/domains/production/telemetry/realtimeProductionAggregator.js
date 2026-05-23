'use strict';

async function aggregateRealtimeProduction(companyId, ctx = {}) {
  const lines = ctx.lines || [];
  const rows = ctx.shift_rows || [];
  const now = Date.now();
  const lastUpdate = rows.reduce((max, r) => {
    const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
    return Math.max(max, t);
  }, 0);
  const staleMs = 6 * 60 * 60 * 1000;
  const stale_telemetry = lastUpdate > 0 && now - lastUpdate > staleMs;

  return {
    company_id: companyId,
    lines_count: lines.length,
    shift_records: rows.length,
    stale_telemetry,
    telemetry_integrity: lines.length && !stale_telemetry ? 'ok' : lines.length ? 'stale' : 'empty',
    aggregated_at: new Date().toISOString()
  };
}

module.exports = { aggregateRealtimeProduction };
