'use strict';

const health = require('./qualityPublicationHealthService');
const audience = require('./qualityAudienceActivationEngine');
const rollout = require('./qualityActivationRolloutEngine');
const stability = require('./qualityPublicationStabilityMonitor');
const telemetry = require('./qualityActivationTelemetry');
const audit = require('./qualityActivationAudit');

/**
 * Orquestração de ativação controlada QUALITY.
 */
function runActivationOrchestration(ctx = {}) {
  const checks = health.runSafeActivationChecks({
    tenantId: ctx.tenantId || null,
    hasQualityIntelligenceModule: ctx.hasQualityIntelligenceModule
  });
  stability.recordStabilitySample({ ok: checks.readiness.ready, stage: checks.activation_stage });

  return {
    checks,
    rollout: rollout.describeRolloutProgress(checks.activation_stage),
    audience_engine: 'qualityAudienceActivationEngine_v1'
  };
}

function runShadowPublicationPreview(reqBody = {}) {
  telemetry.noteShadowPublication();
  const samples = Array.isArray(reqBody.sample_users) ? reqBody.sample_users : [];
  const matrix = audience.previewAudienceMatrix(samples);
  audit.recordQualityActivationAudit({
    event: 'shadow_publication_preview',
    meta: { sample_count: matrix.length }
  });
  return {
    ok: true,
    shadow: true,
    audience_preview: matrix,
    checks: health.runSafeActivationChecks({
      tenantId: reqBody.tenant_id || null,
      hasQualityIntelligenceModule: reqBody.has_quality_intelligence !== false
    })
  };
}

module.exports = {
  runActivationOrchestration,
  runShadowPublicationPreview
};
