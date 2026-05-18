'use strict';

const obs = require('../shared/environmentOperationalObservability');

function base(ctx, op, extra = {}) {
  return obs.withTiming(
    'environment_sampling_runtime_ms',
    () => ({
      ok: true,
      module: 'emissions',
      operation: op,
      company_id: ctx.companyId,
      parameters: {
        stack_id: ctx.stack_id ?? null,
        pm: ctx.pm ?? null,
        nox: ctx.nox ?? null,
        sox: ctx.sox ?? null,
        co2: ctx.co2 ?? null,
        voc: ctx.voc ?? null,
        flare: ctx.flare ?? null
      },
      recorded_at: new Date().toISOString(),
      ...extra,
      assistive_only: true
    }),
    { module: 'emissions', operation: op }
  );
}

function emissionsOperationalRuntime(ctx) {
  return base(ctx, 'stack_monitoring');
}
function emissionsSamplingRuntime(ctx) {
  return base(ctx, 'sampling');
}
function emissionsTelemetryRuntime(ctx) {
  return base(ctx, 'continuous_monitoring', { telemetry: true });
}
function emissionsAlertRuntime(ctx) {
  return base(ctx, 'alert', { alert_level: ctx.level || 'warning' });
}
function emissionsOfflineRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_offline_queue_size', ctx.queue_size || 0, { module: 'emissions' });
  return base(ctx, 'offline');
}

module.exports = {
  emissionsOperationalRuntime,
  emissionsSamplingRuntime,
  emissionsTelemetryRuntime,
  emissionsAlertRuntime,
  emissionsOfflineRuntime
};
