'use strict';

const { validateAuthorityConsistency } = require('./authorityConsistencyValidator');
const { validateCausalIntegrity } = require('./causalIntegrityValidator');

function evaluateRuntimeIntegrity(payload = {}) {
  const authority = validateAuthorityConsistency(payload);
  const causal = validateCausalIntegrity(payload);
  const integrity_alerts = [];

  if (!authority.authority_consistent) integrity_alerts.push('authority_inconsistency');
  if (authority.hidden_fallback_detected) integrity_alerts.push('hidden_fallback');
  if (authority.frontend_authority_drift) integrity_alerts.push('frontend_backend_divergence');
  if (!causal.causal_safety) integrity_alerts.push('causal_weakness');
  if (payload.cognitive_authority_runtime?.fragmentation_detected) integrity_alerts.push('fragmentation_residual');
  if (payload.production_delivery_certification?.certification_safe === false && payload.production_authority_runtime?.authority_mode === 'AUTHORITATIVE_CONTROLLED') {
    integrity_alerts.push('certification_mismatch');
  }
  if (payload.real_confidence_runtime?.validation?.inflated_confidence_detected) {
    integrity_alerts.push('confidence_contradiction');
  }
  if (payload.executive_alignment_runtime?.narrative?.narrative_risk_level === 'high') {
    integrity_alerts.push('narrative_drift');
  }

  const frontend_alignment =
    payload.production_frontend_convergence?.frontend_authority_alignment ??
    payload.cognitive_authority_runtime?.frontend_runtime_alignment ??
    0.5;

  const certification_integrity = payload.production_delivery_certification?.certification_safe === true ? 1 : 0.4;
  const fragmentation_residual = payload.cognitive_authority_runtime?.fragmentation_detected === true ? 0.35 : 0.1;

  const runtime_integrity_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        authority.authority_integrity_score * 0.3 +
          causal.causal_integrity_score * 0.25 +
          frontend_alignment * 0.2 +
          certification_integrity * 0.15 +
          (1 - fragmentation_residual) * 0.1 -
          integrity_alerts.length * 0.04
      )
    ).toFixed(3)
  );

  const integrity_safe = runtime_integrity_score >= 0.65 && integrity_alerts.length <= 2;

  return {
    runtime_integrity_score,
    authority_consistency: authority.authority_integrity_score,
    causal_consistency: causal.causal_integrity_score,
    frontend_alignment: Number(frontend_alignment.toFixed(3)),
    certification_integrity: Number(certification_integrity.toFixed(3)),
    fragmentation_residual: Number(fragmentation_residual.toFixed(3)),
    integrity_safe,
    integrity_alerts,
    authority,
    causal,
    auto_mutation: false
  };
}

module.exports = { evaluateRuntimeIntegrity };
