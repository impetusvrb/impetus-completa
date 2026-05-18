'use strict';

const obs = require('../shared/environmentOperationalObservability');

function base(ctx, op) {
  return obs.withTiming(
    'environment_operational_runtime_ms',
    () => ({
      ok: true,
      module: 'water',
      operation: op,
      company_id: ctx.companyId,
      recorded_at: new Date().toISOString(),
      assistive_only: true
    }),
    { module: 'water', operation: op }
  );
}

function waterOperationalRuntime(ctx) {
  return base(ctx, ctx.operation || 'consumption');
}
function waterCollectionRuntime(ctx) {
  return base(ctx, 'collection');
}
function waterInspectionRuntime(ctx) {
  return base(ctx, 'inspection');
}
function waterEvidenceRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_evidence_upload_ms', ctx.upload_ms || 0, { module: 'water' });
  return base(ctx, 'evidence');
}
function waterTelemetryHooks(ctx) {
  return { ok: true, module: 'water', hooks: ['flow', 'ph', 'turbidity'], shadow: true };
}
function waterRealtimeRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_realtime_latency_ms', ctx.latency_ms || 0, { module: 'water' });
  return { ok: true, module: 'water', realtime: true, last_reading: ctx.reading || null };
}
function waterOfflineRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_offline_queue_size', ctx.queue_size || 0, { module: 'water' });
  return { ok: true, module: 'water', offline_queued: !!ctx.queued };
}

module.exports = {
  waterOperationalRuntime,
  waterCollectionRuntime,
  waterInspectionRuntime,
  waterEvidenceRuntime,
  waterTelemetryHooks,
  waterRealtimeRuntime,
  waterOfflineRuntime
};
