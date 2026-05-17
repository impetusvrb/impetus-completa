'use strict';

const health = require('./safetyPublicationHealthService');
const audience = require('./safetyAudienceActivationEngine');
const rollout = require('./safetyActivationRolloutEngine');
const stability = require('./safetyPublicationStabilityMonitor');
const telemetry = require('./safetyActivationTelemetry');
const audit = require('./safetyActivationAudit');

function runActivationOrchestration(ctx = {}) {
  const checks = health.runSafeActivationChecks({
    tenantId: ctx.tenantId || null,
    hasSafetyIntelligenceModule: ctx.hasSafetyIntelligenceModule
  });
  stability.recordStabilitySample({ ok: checks.readiness.ready, stage: checks.activation_stage });
  return {
    checks,
    rollout: rollout.describeRolloutProgress(checks.activation_stage),
    audience_engine: 'safetyAudienceActivationEngine_v1'
  };
}

function runShadowPublicationPreview(reqBody = {}) {
  telemetry.noteShadowPublication();
  const samples = Array.isArray(reqBody.sample_users) ? reqBody.sample_users : [];
  const matrix = audience.previewAudienceMatrix(samples);
  audit.recordSafetyActivationAudit({
    event: 'shadow_publication_preview',
    meta: { sample_count: matrix.length }
  });
  return {
    ok: true,
    shadow: true,
    domain: 'safety',
    audience_preview: matrix,
    checks: health.runSafeActivationChecks({
      tenantId: reqBody.tenant_id || null,
      hasSafetyIntelligenceModule: reqBody.has_safety_intelligence !== false
    })
  };
}

module.exports = {
  runActivationOrchestration,
  runShadowPublicationPreview
};
