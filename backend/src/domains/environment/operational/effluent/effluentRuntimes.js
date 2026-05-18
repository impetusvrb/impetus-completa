'use strict';

const obs = require('../shared/environmentOperationalObservability');

function base(ctx, op, extra = {}) {
  return obs.withTiming(
    'environment_sampling_runtime_ms',
    () => ({
      ok: true,
      module: 'effluent',
      operation: op,
      company_id: ctx.companyId,
      parameters: {
        ph: ctx.ph ?? null,
        dbo: ctx.dbo ?? null,
        dqo: ctx.dqo ?? null,
        flow: ctx.flow ?? null,
        solids: ctx.solids ?? null,
        temperature: ctx.temperature ?? null
      },
      recorded_at: new Date().toISOString(),
      ...extra,
      assistive_only: true
    }),
    { module: 'effluent', operation: op }
  );
}

function effluentOperationalRuntime(ctx) {
  return base(ctx, 'ete_operational');
}
function effluentSamplingRuntime(ctx) {
  return base(ctx, 'sampling', { sample_id: ctx.sample_id || `eff-${Date.now()}` });
}
function effluentRealtimeRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_realtime_latency_ms', ctx.latency_ms || 0, { module: 'effluent' });
  return base(ctx, 'realtime');
}
function effluentEvidenceRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_evidence_upload_ms', ctx.upload_ms || 0, { module: 'effluent' });
  return base(ctx, 'evidence');
}
function effluentOfflineRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_offline_queue_size', ctx.queue_size || 0, { module: 'effluent' });
  return base(ctx, 'offline');
}
function effluentIncidentRuntime(ctx) {
  return base(ctx, 'environmental_nc', { nc_opened: true, severity: ctx.severity || 'moderate' });
}

module.exports = {
  effluentOperationalRuntime,
  effluentSamplingRuntime,
  effluentRealtimeRuntime,
  effluentEvidenceRuntime,
  effluentOfflineRuntime,
  effluentIncidentRuntime
};
