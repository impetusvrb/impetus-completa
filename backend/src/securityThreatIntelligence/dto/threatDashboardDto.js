'use strict';

/**
 * SEC-03 — Threat Dashboard DTO (uso interno).
 */

function createThreatDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'threat_dashboard_v1',
    generated_at: now,
    intelligence_enabled: Boolean(input.intelligence_enabled),
    top_campaigns: Array.isArray(input.top_campaigns) ? input.top_campaigns : [],
    top_threat_profiles: Array.isArray(input.top_threat_profiles) ? input.top_threat_profiles : [],
    top_indicators: Array.isArray(input.top_indicators) ? input.top_indicators : [],
    top_origins: Array.isArray(input.top_origins) ? input.top_origins : [],
    top_providers: Array.isArray(input.top_providers) ? input.top_providers : [],
    top_asns: Array.isArray(input.top_asns) ? input.top_asns : [],
    top_targets: Array.isArray(input.top_targets) ? input.top_targets : [],
    historical_evolution: input.historical_evolution || [],
    threat_confidence: input.threat_confidence || { average: 0, distribution: {} },
    profiles: Array.isArray(input.profiles) ? input.profiles : [],
    metrics_summary: input.metrics_summary || {}
  };
}

module.exports = { createThreatDashboardDto };
