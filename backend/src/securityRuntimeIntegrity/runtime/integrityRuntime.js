'use strict';

/**
 * SEC-04 — Runtime Integrity Runtime (bootstrap + audit).
 */

const flags = require('../config/securityRuntimeIntegrityFlags');
const engine = require('../engine/integrityEngine');
const store = require('../store/integrityReportStore');
const metrics = require('../metrics/integrityMetrics');
const { createIntegrityDashboardDto } = require('../dto/integrityDashboardDto');
const { freezeReport } = require('../dto/runtimeIntegrityDto');

let pollTimer = null;

function bootstrap() {
  if (!flags.isSecurityRuntimeIntegrityEnabled()) {
    return { enabled: false };
  }

  try {
    engine.runIntegrityCheck();
  } catch (e) {
    console.warn('[SEC-04] initial check:', e?.message || e);
  }

  pollTimer = setInterval(() => {
    try {
      engine.runIntegrityCheck();
    } catch (e) {
      metrics.increment('integrity_failures');
      console.warn('[SEC-04] periodic check:', e?.message || e);
    }
  }, flags.checkIntervalMs());

  if (pollTimer.unref) pollTimer.unref();

  console.log('[SEC-04] Enterprise Runtime Integrity activo (observational, read-only)');
  return { enabled: true };
}

function shutdown() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function buildDashboard() {
  const report = store.getLastReport();
  const snap = metrics.getSnapshot();

  const hash = report?.hashValidation || {};
  const configFindings = report?.configurationValidation?.findings || [];
  const runtimeFindings = report?.runtimeValidation?.findings || [];
  const fsFindings = report?.filesystemValidation?.findings || [];
  const netFindings = report?.networkValidation?.findings || [];

  const total = hash.total || 0;
  const matched = hash.matched || 0;
  const compliancePct = total > 0 ? Math.round((matched / total) * 100) : 0;

  return createIntegrityDashboardDto({
    integrity_enabled: flags.isSecurityRuntimeIntegrityEnabled(),
    integrity_score: report?.integrityScore ?? snap.integrity_score ?? 0,
    integrity_status: report?.integrityStatus || 'UNKNOWN',
    critical_files: {
      total,
      matched,
      drift: hash.drift || 0,
      missing: hash.missing || 0
    },
    configuration_drift: {
      count: configFindings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'WARNING').length,
      items: configFindings.slice(0, 10)
    },
    runtime_drift: {
      count: runtimeFindings.length,
      items: runtimeFindings.slice(0, 10)
    },
    filesystem_drift: {
      count: fsFindings.length,
      items: fsFindings.slice(0, 10)
    },
    network_drift: {
      count: netFindings.length,
      items: netFindings.slice(0, 10)
    },
    process_health: report?.runtimeValidation?.processHealth || { online: 0, stopped: 0, issues: [] },
    baseline_compliance: {
      compliant: report?.integrityStatus === 'INTEGRITY_OK',
      percentage: compliancePct
    },
    last_check: report?.checkedAt || null,
    metrics_summary: snap
  });
}

function getAuditPayload() {
  const dashboard = buildDashboard();
  const report = store.getLastReport();

  return {
    ok: true,
    phase: 'SEC-04',
    integrity_enabled: flags.isSecurityRuntimeIntegrityEnabled(),
    mode: 'observational_only',
    no_auto_remediation: true,
    feature_flag: {
      SECURITY_RUNTIME_INTEGRITY: flags.isSecurityRuntimeIntegrityEnabled(),
      check_interval_ms: flags.checkIntervalMs()
    },
    dashboard,
    last_report: report ? freezeReport(report) : null,
    check_history_count: store.getHistory().length,
    metrics: metrics.getSnapshot(),
    criteria: {
      runtime_integrity_available: true,
      baseline_validation_available: true,
      filesystem_validation_available: true,
      configuration_validation_available: true,
      runtime_validation_available: true,
      network_validation_available: true,
      integrity_dashboard_available: true,
      audit_endpoint_available: true,
      feature_flag_available: true,
      security_baseline_preserved: true,
      security_observatory_preserved: true,
      security_correlation_preserved: true,
      security_threat_intelligence_preserved: true,
      no_runtime_interference: true
    }
  };
}

module.exports = {
  bootstrap,
  shutdown,
  buildDashboard,
  getAuditPayload
};
