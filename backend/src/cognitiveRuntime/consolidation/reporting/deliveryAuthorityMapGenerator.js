'use strict';

function generateDeliveryAuthorityMap(authority, dominance, cockpits, fallback, fragmentation, v2audit, frontend) {
  return {
    generated_at: new Date().toISOString(),
    official_runtime: authority.official_runtime,
    fallback_runtime: authority.fallback_runtime,
    dominant_delivery: dominance.dominant_delivery_runtime,
    channels: dominance.channels,
    cockpit_domains: cockpits.domains,
    fallback_zones: fallback.zones,
    fragmentation: {
      detected: fragmentation.fragmentation_detected,
      score: fragmentation.fragmentation_score,
      issues: fragmentation.issues
    },
    engine_v2: {
      status: v2audit.status,
      adds_value: v2audit.engine_v2_adds_value,
      redundant: v2audit.engine_v2_redundant
    },
    frontend: {
      predicted: frontend.predicted_source,
      alignment: frontend.frontend_runtime_alignment
    },
    governance_stability: fragmentation.fragmentation_score < 0.5 ? 'stable' : 'elevated'
  };
}

module.exports = { generateDeliveryAuthorityMap };
