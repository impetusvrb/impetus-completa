'use strict';

/**
 * SEC-07 — Operations Dashboard DTO.
 */

function createOperationsDashboardDto(input) {
  return {
    schema_version: 'soc_operations_v1',
    generated_at: new Date().toISOString(),
    active_incidents: input.active_incidents || [],
    closed_incidents: input.closed_incidents || [],
    alerts: input.alerts || [],
    notifications: input.notifications || [],
    pending_notifications: input.pending_notifications || [],
    suggested_responses: input.suggested_responses || [],
    health: input.health || {},
    integrity: input.integrity || {},
    baseline: input.baseline || {},
    observatory_metrics: input.observatory_metrics || {},
    correlation_metrics: input.correlation_metrics || {},
    threat_profiles: input.threat_profiles || [],
    response_history: input.response_history || []
  };
}

module.exports = { createOperationsDashboardDto };
