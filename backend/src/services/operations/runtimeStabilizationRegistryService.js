'use strict';

/**
 * P0D.6 — Runtime Stabilization Registry Service
 * READ ONLY · in-memory observational snapshots (sem mutação BD)
 */

const runtimeValidation = require('./runtimeActivationValidationService');

const LAYER = 'P0D_RUNTIME_STABILIZATION_REGISTRY';
const MAX_SNAPSHOTS = 48;

const _snapshots = [];

function buildRegistryEntry(report) {
  const early = report.early_flow || {};
  const stab = report.stabilization || {};
  const activation = report.activation || {};

  return {
    timestamp: report.generated_at,
    activation_timestamp: early.first_ioe_at || activation.boot_evidence?.event_pipeline_boot_ok
      ? report.generated_at
      : null,
    first_ioe_at: early.first_ioe_at ?? null,
    first_delivery_at: early.first_delivery_at ?? null,
    runtime_activated: activation.runtime_activated ?? false,
    ioe_per_hour: stab.throughput_ioe_per_hour ?? 0,
    deliveries_per_hour: early.new_outbox_deliveries ?? 0,
    active_tenants: report.multi_tenant?.active_tenants ?? 0,
    backlog: stab.backlog_pending ?? 0,
    throughput_evolution: stab.hourly_ioe ?? [],
    stabilization_metrics: {
      runtime_stable: stab.runtime_stable ?? false,
      failed_total: stab.failed_total ?? 0,
      retries_in_window: stab.retries_in_window ?? 0
    },
    platform_status: report.health?.pm2?.status ?? 'unknown',
    pass: report.pass ?? false,
    verdict: report.verdict ?? report.reason
  };
}

async function collectAndRegisterSnapshot(db, options = {}) {
  const report = await runtimeValidation.generateRuntimeStabilizationValidation({
    db,
    windowHours: options.windowHours,
    earlyWindowMinutes: options.earlyWindowMinutes,
    apiBase: options.apiBase
  });

  const entry = buildRegistryEntry(report);
  _snapshots.unshift(entry);
  if (_snapshots.length > MAX_SNAPSHOTS) {
    _snapshots.length = MAX_SNAPSHOTS;
  }

  return {
    layer: LAYER,
    mode: 'OBSERVATIONAL_READ_ONLY',
    registry_size: _snapshots.length,
    latest: entry,
    report
  };
}

function getRegistryHistory(limit = 20) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_SNAPSHOTS);
  return {
    layer: LAYER,
    mode: 'OBSERVATIONAL_READ_ONLY',
    generated_at: new Date().toISOString(),
    snapshot_count: _snapshots.length,
    max_snapshots: MAX_SNAPSHOTS,
    snapshots: _snapshots.slice(0, lim)
  };
}

function getLatestSnapshot() {
  return _snapshots[0] || null;
}

module.exports = {
  LAYER,
  MAX_SNAPSHOTS,
  buildRegistryEntry,
  collectAndRegisterSnapshot,
  getRegistryHistory,
  getLatestSnapshot
};
