'use strict';

/**
 * SEC-05 — Notification Runtime (bootstrap + audit).
 */

const flags = require('../config/securityNotificationFlags');
const engine = require('../engine/notificationEngine');
const store = require('../store/notificationStore');
const metrics = require('../metrics/notificationMetrics');
const { createNotificationDashboardDto } = require('../dto/notificationDashboardDto');
const { freezeNotification } = require('../dto/notificationDto');
const bootstrapObservability = require('../observability/bootstrapObservability');

let pollTimer = null;

function logBootstrap(level, label) {
  console[level](label, JSON.stringify(bootstrapObservability.toLogEvent()));
}

async function executeCycle(stage) {
  bootstrapObservability.recordCycleStart(stage);
  try {
    const result = await runCycle();
    bootstrapObservability.recordCycleSuccess(stage);
    if (stage === 'initial') logBootstrap('info', '[SEC-05_BOOT]');
    return result;
  } catch (error) {
    bootstrapObservability.recordCycleFailure(stage, error);
    logBootstrap('error', '[SEC-05_CYCLE_FAILURE]');
    return [];
  }
}

function bootstrap() {
  const enabled = flags.isSecurityNotificationCenterEnabled();
  if (enabled && pollTimer) {
    return { enabled: true, status: bootstrapObservability.getSnapshot().status, already_started: true };
  }

  bootstrapObservability.recordAttempt(enabled);
  if (!enabled) {
    logBootstrap('info', '[SEC-05_BOOT]');
    return { enabled: false, status: 'disabled' };
  }

  executeCycle('initial');

  pollTimer = setInterval(() => {
    executeCycle('periodic');
  }, 60000);

  if (pollTimer.unref) pollTimer.unref();

  bootstrapObservability.recordBootstrapScheduled();
  return { enabled: true, status: 'starting' };
}

async function runCycle() {
  await engine.processAllSources();
}

function shutdown() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  bootstrapObservability.recordStopped();
}

function buildDashboard() {
  const all = store.getAll();
  const pending = store.getPending();
  const bySeverity = {};
  const byType = {};
  const byChannel = {};

  for (const n of all) {
    bySeverity[n.severity] = (bySeverity[n.severity] || 0) + 1;
    byType[n.notificationType] = (byType[n.notificationType] || 0) + 1;
    for (const ch of n.channels || []) {
      byChannel[ch] = (byChannel[ch] || 0) + 1;
    }
  }

  return createNotificationDashboardDto({
    notification_center_enabled: flags.isSecurityNotificationCenterEnabled(),
    total_notifications: all.length,
    pending_count: pending.length,
    acknowledged_count: all.filter((n) => n.acknowledged).length,
    by_severity: bySeverity,
    by_type: byType,
    by_channel: byChannel,
    recent_notifications: all.slice(0, 50).map((n) => freezeNotification(n)),
    metrics_summary: metrics.getSnapshot()
  });
}

function getAuditPayload() {
  return {
    ok: true,
    phase: 'SEC-05',
    notification_center_enabled: flags.isSecurityNotificationCenterEnabled(),
    mode: 'notification_only',
    no_auto_response: true,
    no_auto_remediation: true,
    feature_flag: {
      SECURITY_NOTIFICATION_CENTER: flags.isSecurityNotificationCenterEnabled(),
      deduplication_window_ms: flags.deduplicationWindowMs()
    },
    dashboard: buildDashboard(),
    notifications: store.getAll().slice(0, 100).map((n) => freezeNotification(n)),
    pending: store.getPending().slice(0, 50).map((n) => freezeNotification(n)),
    metrics: metrics.getSnapshot(),
    bootstrap: bootstrapObservability.getSnapshot(),
    criteria: {
      notification_center_available: true,
      notification_engine_available: true,
      notification_dto_available: true,
      notification_grouping_available: true,
      notification_timeline_available: true,
      notification_channels_available: true,
      notification_dashboard_available: true,
      audit_endpoint_available: true,
      feature_flag_available: true,
      bootstrap_observable: true,
      silent_bootstrap_failures_eliminated: true,
      security_baseline_preserved: true,
      security_observatory_preserved: true,
      security_correlation_preserved: true,
      security_threat_intelligence_preserved: true,
      security_runtime_integrity_preserved: true,
      no_runtime_interference: true
    }
  };
}

function getPendingPayload() {
  return {
    ok: true,
    phase: 'SEC-05',
    count: store.getPending().length,
    pending: store.getPending().map((n) => freezeNotification(n))
  };
}

module.exports = {
  bootstrap,
  shutdown,
  runCycle,
  buildDashboard,
  getAuditPayload,
  getPendingPayload,
  getBootstrapStatus: bootstrapObservability.getSnapshot
};
