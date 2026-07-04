'use strict';

/**
 * SEC-04 — Integrity Dashboard DTO.
 */

function createIntegrityDashboardDto(input) {
  return {
    schema_version: 'integrity_dashboard_v1',
    generated_at: new Date().toISOString(),
    integrity_enabled: Boolean(input.integrity_enabled),
    integrity_score: Number(input.integrity_score) || 0,
    integrity_status: input.integrity_status || 'UNKNOWN',
    critical_files: input.critical_files || { total: 0, matched: 0, drift: 0, missing: 0 },
    configuration_drift: input.configuration_drift || { count: 0, items: [] },
    runtime_drift: input.runtime_drift || { count: 0, items: [] },
    filesystem_drift: input.filesystem_drift || { count: 0, items: [] },
    network_drift: input.network_drift || { count: 0, items: [] },
    process_health: input.process_health || { online: 0, stopped: 0, issues: [] },
    baseline_compliance: input.baseline_compliance || { compliant: false, percentage: 0 },
    last_check: input.last_check || null,
    metrics_summary: input.metrics_summary || {}
  };
}

module.exports = { createIntegrityDashboardDto };
