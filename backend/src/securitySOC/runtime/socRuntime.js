'use strict';

/**
 * SEC-07 — SOC Runtime (bootstrap + audit payloads).
 */

const flags = require('../config/securitySOCFlags');
const builder = require('../engine/socDashboardBuilder');
const metrics = require('../metrics/socMetrics');

function bootstrap() {
  if (!flags.isSecuritySOCEnabled()) {
    return { enabled: false };
  }

  try {
    builder.buildSOC({ force: true });
  } catch (e) {
    console.warn('[SEC-07] initial build:', e?.message);
  }

  console.log('[SEC-07] Enterprise Security Operations Center activo (read-only dashboard)');
  return { enabled: true };
}

function shutdown() {
  builder.invalidateCache();
}

function getAuditPayload() {
  metrics.increment('soc_dashboard_requests');
  const soc = flags.isSecuritySOCEnabled() ? builder.buildSOC() : null;

  return {
    ok: true,
    phase: 'SEC-07',
    soc_enabled: flags.isSecuritySOCEnabled(),
    mode: 'read_only_dashboard',
    read_only_dashboard: true,
    no_runtime_changes: true,
    no_response_execution: true,
    feature_flag: { SECURITY_SOC: flags.isSecuritySOCEnabled() },
    soc: soc || null,
    metrics: metrics.getSnapshot(),
    criteria: {
      security_soc_available: true,
      executive_dashboard_available: true,
      operations_dashboard_available: true,
      overall_security_score_available: true,
      executive_summary_available: true,
      timeline_available: true,
      feature_flag_available: true,
      audit_endpoints_available: true,
      read_only_dashboard: true,
      security_response_orchestrator_preserved: true
    }
  };
}

function getExecutivePayload() {
  metrics.increment('soc_executive_requests');
  const soc = builder.buildSOC({ force: true });
  return {
    ok: true,
    phase: 'SEC-07',
    executive: soc?.executiveDashboard || null,
    executive_summary: soc?.executiveSummary || '',
    overall_security_score: soc?.overallSecurityScore ?? 0,
    soc_status: soc?.socStatus || 'UNKNOWN',
    timeline: soc?.timeline || [],
    metrics: metrics.getSnapshot()
  };
}

function getOperationsPayload() {
  metrics.increment('soc_operations_requests');
  const soc = builder.buildSOC({ force: true });
  return {
    ok: true,
    phase: 'SEC-07',
    operations: soc?.operationalDashboard || null,
    active_incidents: soc?.activeIncidents || [],
    pending_notifications: soc?.pendingNotifications || [],
    recommended_responses: soc?.recommendedResponses || [],
    runtime_health: soc?.runtimeHealth || {},
    integrity: soc?.currentIntegrity || {},
    metrics: metrics.getSnapshot()
  };
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  getExecutivePayload,
  getOperationsPayload
};
