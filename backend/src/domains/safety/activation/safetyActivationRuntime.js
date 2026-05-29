'use strict';

const health = require('./safetyPublicationHealthService');
const audience = require('./safetyAudienceActivationEngine');
const rollout = require('./safetyActivationRolloutEngine');
const stability = require('./safetyPublicationStabilityMonitor');
const telemetry = require('./safetyActivationTelemetry');
const audit = require('./safetyActivationAudit');

let _policyEngine = null;
function _getPolicyEngine() {
  if (!_policyEngine) {
    try { _policyEngine = require('../../../../governance/domainPolicyEngine'); } catch (_) { _policyEngine = null; }
  }
  return _policyEngine;
}

function runActivationOrchestration(ctx = {}) {
  const checks = health.runSafeActivationChecks({
    tenantId: ctx.tenantId || null,
    hasSafetyIntelligenceModule: ctx.hasSafetyIntelligenceModule
  });
  stability.recordStabilitySample({ ok: checks.readiness.ready, stage: checks.activation_stage });

  let policyGate = null;
  const pe = _getPolicyEngine();
  if (pe) {
    policyGate = pe.evaluate({
      domain: 'safety',
      action_type: 'activate',
      user_role: ctx.user_role || '',
      risk_level: 'high',
      runtime_mode: checks.activation_stage === 'full' ? 'on' : 'shadow',
      company_id: ctx.tenantId
    });
  }

  return {
    checks,
    rollout: rollout.describeRolloutProgress(checks.activation_stage),
    audience_engine: 'safetyAudienceActivationEngine_v1',
    policy_gate: policyGate
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
