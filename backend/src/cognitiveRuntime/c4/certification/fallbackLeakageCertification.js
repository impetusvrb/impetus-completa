'use strict';

function certifyFallbackLeakage(payload = {}, deliveryMap = {}, frontend = {}, escalation = {}) {
  const hidden_legacy_delivery =
    deliveryMap.hidden_legacy_ratio > 0.3 || (payload.widgets_legacy?.length ?? 0) > (payload.widgets_promoted?.length ?? 0);

  const shadow_masking =
    payload.cognitive_runtime_report?.phase_stack?.includes('shadow') &&
    payload.cognitive_render_promotion?.promotion_applied &&
    deliveryMap.fallback_ratio > 0.25;

  const v2_dominance = deliveryMap.delivery_map?.filter((d) => d.v2_residual).length > deliveryMap.delivery_map?.filter((d) => d.authoritative).length;

  const authority_drift_detected =
    escalation.authority_conflicts > 0 || (escalation.frontend_divergence_detected && payload.production_cognitive_runtime?.consolidation_applied);

  const enrich_residual = deliveryMap.delivery_map?.some((d) => d.enrich && !d.authoritative) ?? false;

  const fallback_leakage_detected =
    hidden_legacy_delivery || shadow_masking || v2_dominance || authority_drift_detected;

  let leakage_severity = 'none';
  if (fallback_leakage_detected) {
    const score = (hidden_legacy_delivery ? 1 : 0) + (shadow_masking ? 1 : 0) + (v2_dominance ? 1 : 0) + (authority_drift_detected ? 1 : 0);
    leakage_severity = score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low';
  }

  return {
    fallback_leakage_detected,
    hidden_legacy_delivery,
    authority_drift_detected,
    shadow_masking_detected: shadow_masking,
    enrich_residual,
    v2_dominance_residual: v2_dominance,
    leakage_severity,
    auto_remediation: false
  };
}

module.exports = { certifyFallbackLeakage };
