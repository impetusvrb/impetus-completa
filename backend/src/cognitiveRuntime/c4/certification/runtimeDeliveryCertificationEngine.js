'use strict';

function certifyRuntimeDelivery(payload = {}, authority = {}, frontend = {}, deliveryMap = {}, escalation = {}) {
  const channels = {
    delivery: deliveryMap.authoritative_ratio >= 0.5 && frontend.authoritative_widgets_visible,
    authority: authority.authority_mode === 'AUTHORITATIVE_CONTROLLED' && authority.runtime_authority_score >= 0.58,
    frontend: frontend.convergence_safe === true,
    convergence: escalation.escalation_safe === true,
    bottleneck: !!payload.production_bottleneck_runtime?.primary_bottleneck,
    economic: payload.operational_economic_runtime?.estimated_loss != null
  };

  const certified_delivery_channels = Object.entries(channels)
    .filter(([, ok]) => ok)
    .map(([k]) => k);
  const uncertified_channels = Object.entries(channels)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  const runtime_certification_score = Number(
    (certified_delivery_channels.length / Object.keys(channels).length).toFixed(3)
  );

  const authoritative_integrity = authority.authority_mode === 'AUTHORITATIVE_CONTROLLED' && escalation.authority_conflicts === 0;
  const fallback_integrity = deliveryMap.fallback_ratio < 0.45;
  const certification_safe = runtime_certification_score >= 0.65 && authoritative_integrity && fallback_integrity;

  return {
    certified_delivery_channels,
    uncertified_channels,
    runtime_certification_score,
    authoritative_integrity,
    fallback_integrity,
    certification_safe,
    certifications: channels,
    auto_mutation: false
  };
}

module.exports = { certifyRuntimeDelivery };
