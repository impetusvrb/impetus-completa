'use strict';

/**
 * SEC-01 — Security Dashboard DTO (uso interno / audit endpoint).
 */

function createSecurityDashboardDto(input) {
  const now = new Date().toISOString();
  return Object.freeze({
    schema_version: 'security_dashboard_v1',
    generated_at: input.generated_at || now,
    observatory_enabled: !!input.observatory_enabled,
    security_health: input.security_health || 'unknown',
    incident_rate_per_hour: Number(input.incident_rate_per_hour) || 0,
    attack_surface_activity: input.attack_surface_activity || {
      requests_per_minute: 0,
      unique_ips: 0,
      unique_paths: 0,
      status_distribution: {}
    },
    top_origins: Array.isArray(input.top_origins) ? input.top_origins.slice(0, 20) : [],
    top_paths: Array.isArray(input.top_paths) ? input.top_paths.slice(0, 20) : [],
    top_user_agents: Array.isArray(input.top_user_agents) ? input.top_user_agents.slice(0, 15) : [],
    top_classifications: Array.isArray(input.top_classifications) ? input.top_classifications.slice(0, 10) : [],
    timeline: Array.isArray(input.timeline) ? input.timeline : [],
    metrics_summary: input.metrics_summary || {},
    feature_flag: {
      SECURITY_OBSERVATORY: input.observatory_enabled === true
    }
  });
}

module.exports = { createSecurityDashboardDto };
