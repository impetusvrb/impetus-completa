'use strict';

const obs = require('../shared/environmentOperationalObservability');

function base(ctx, op, extra = {}) {
  const score = ctx.field_pressure_score ?? 0;
  obs.recordEnvironmentOperationalMetric('environment_environmental_field_pressure_score', score, { operation: op });
  return obs.withTiming(
    'environment_operational_runtime_ms',
    () => ({
      ok: true,
      module: 'field',
      operation: op,
      company_id: ctx.companyId,
      geo: ctx.geo || null,
      recorded_at: new Date().toISOString(),
      ...extra,
      assistive_only: true
    }),
    { module: 'field', operation: op }
  );
}

function environmentalFieldRuntime(ctx) {
  return base(ctx, 'field_patrol');
}
function environmentalOccurrenceRuntime(ctx) {
  return base(ctx, 'occurrence', { occurrence_type: ctx.occurrence_type || 'general' });
}
function environmentalInspectionRuntime(ctx) {
  return base(ctx, 'inspection');
}
function environmentalEvidenceRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_evidence_upload_ms', ctx.upload_ms || 0, { module: 'field' });
  return base(ctx, 'evidence');
}
function environmentalGeoRuntime(ctx) {
  return base(ctx, 'geo', { lat: ctx.lat ?? null, lng: ctx.lng ?? null });
}
function environmentalOfflineRuntime(ctx) {
  obs.recordEnvironmentOperationalMetric('environment_offline_queue_size', ctx.queue_size || 0, { module: 'field' });
  return base(ctx, 'offline');
}

module.exports = {
  environmentalFieldRuntime,
  environmentalOccurrenceRuntime,
  environmentalInspectionRuntime,
  environmentalEvidenceRuntime,
  environmentalGeoRuntime,
  environmentalOfflineRuntime
};
