'use strict';

const obs = require('../shared/environmentOperationalObservability');

function base(ctx, op, extra = {}) {
  return obs.withTiming(
    'environment_operational_runtime_ms',
    () => ({
      ok: true,
      module: 'waste',
      operation: op,
      company_id: ctx.companyId,
      waste_class: ctx.waste_class ?? null,
      mtr_ref: ctx.mtr_ref ?? null,
      recorded_at: new Date().toISOString(),
      ...extra,
      assistive_only: true
    }),
    { module: 'waste', operation: op }
  );
}

function wasteOperationalRuntime(ctx) {
  return base(ctx, 'generation');
}
function wasteManifestRuntime(ctx) {
  return base(ctx, 'mtr', { manifest_created: true });
}
function wasteTrackingRuntime(ctx) {
  return base(ctx, 'tracking', { trace_id: ctx.trace_id || `waste-${Date.now()}` });
}
function wasteEvidenceRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_evidence_upload_ms', ctx.upload_ms || 0, { module: 'waste' });
  return base(ctx, 'evidence');
}
function wasteOfflineRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_offline_queue_size', ctx.queue_size || 0, { module: 'waste' });
  return base(ctx, 'offline');
}

module.exports = {
  wasteOperationalRuntime,
  wasteManifestRuntime,
  wasteTrackingRuntime,
  wasteEvidenceRuntime,
  wasteOfflineRuntime
};
