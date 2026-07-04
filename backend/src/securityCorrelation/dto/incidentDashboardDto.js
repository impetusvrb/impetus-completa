'use strict';

/**
 * SEC-02 — Incident Dashboard DTO (uso interno).
 */

function createIncidentDashboardDto(input) {
  const now = new Date().toISOString();
  return Object.freeze({
    schema_version: 'incident_dashboard_v1',
    generated_at: input.generated_at || now,
    correlation_enabled: !!input.correlation_enabled,
    open_incidents: Number(input.open_incidents) || 0,
    closed_incidents: Number(input.closed_incidents) || 0,
    average_duration_ms: Number(input.average_duration_ms) || 0,
    average_risk_score: Number(input.average_risk_score) || 0,
    top_classifications: Array.isArray(input.top_classifications) ? input.top_classifications.slice(0, 10) : [],
    top_origins: Array.isArray(input.top_origins) ? input.top_origins.slice(0, 15) : [],
    top_services: Array.isArray(input.top_services) ? input.top_services.slice(0, 10) : [],
    top_attack_surface: Array.isArray(input.top_attack_surface) ? input.top_attack_surface.slice(0, 10) : [],
    incidents: Array.isArray(input.incidents) ? input.incidents : [],
    metrics_summary: input.metrics_summary || {}
  });
}

module.exports = { createIncidentDashboardDto };
