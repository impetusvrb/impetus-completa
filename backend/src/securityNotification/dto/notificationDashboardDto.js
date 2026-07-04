'use strict';

/**
 * SEC-05 — Notification Dashboard DTO.
 */

function createNotificationDashboardDto(input) {
  return {
    schema_version: 'notification_dashboard_v1',
    generated_at: new Date().toISOString(),
    notification_center_enabled: Boolean(input.notification_center_enabled),
    total_notifications: Number(input.total_notifications) || 0,
    pending_count: Number(input.pending_count) || 0,
    acknowledged_count: Number(input.acknowledged_count) || 0,
    by_severity: input.by_severity || {},
    by_type: input.by_type || {},
    by_channel: input.by_channel || {},
    recent_notifications: Array.isArray(input.recent_notifications) ? input.recent_notifications : [],
    metrics_summary: input.metrics_summary || {}
  };
}

module.exports = { createNotificationDashboardDto };
