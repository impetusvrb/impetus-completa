'use strict';

function consolidateCognitiveGovernance(payload = {}) {
  const integrity = payload.runtime_integrity_runtime || {};
  const pressure = payload.cognitive_pressure_runtime || {};
  const stability = payload.runtime_stability_runtime || {};
  const drift = payload.runtime_drift_runtime || {};
  const c4 = payload.cognitive_c4_summary || {};
  const c5 = payload.cognitive_c5_summary || {};
  const authority = payload.cognitive_authority_runtime || {};

  const authority_integrity =
    integrity.authority_consistency ??
    integrity.runtime_integrity_score ??
    payload.production_authority_runtime?.runtime_authority_score ??
    0.5;

  const runtime_stability = stability.runtime_stability_score ?? stability.stability_certified ? 0.85 : 0.5;
  const trust_integrity = payload.cognitive_trust_runtime?.cognitive_trust_index ?? 0.5;
  const drift_safe = drift.drift_detected !== true && c5.drift_detected !== true;

  const governance_consolidation_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        authority_integrity * 0.25 +
          runtime_stability * 0.2 +
          trust_integrity * 0.15 +
          (integrity.integrity_safe ? 0.15 : 0) +
          (pressure.pressure_safe !== false ? 0.1 : 0) +
          (c4.certification_safe ? 0.1 : 0) +
          (drift_safe ? 0.05 : 0)
      )
    ).toFixed(3)
  );

  const governance_state = {
    phase: 'C6',
    sovereign_runtime: 'runtime_z',
    authority_mode: payload.production_authority_runtime?.authority_mode || 'CONTROLLED',
    integrity_safe: integrity.integrity_safe ?? c5.integrity_safe,
    stability_certified: stability.stability_certified ?? c5.stability_certified,
    isolation_safe: payload.tenant_isolation_runtime?.isolation_safe ?? c5.isolation_safe,
    enterprise_brain_unified: governance_consolidation_score >= 0.65
  };

  return {
    governance_consolidation_score,
    authority_integrity: Number(authority_integrity).toFixed(3),
    runtime_stability: Number(runtime_stability).toFixed(3),
    trust_integrity: Number(trust_integrity).toFixed(3),
    drift_safe,
    governance_state,
    fragmentation_detected: authority.fragmentation_detected === true,
    auto_mutation: false
  };
}

module.exports = { consolidateCognitiveGovernance };
