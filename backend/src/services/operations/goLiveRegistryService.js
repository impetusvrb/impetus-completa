'use strict';

/**
 * P0E.5 — Go-Live Registry Service
 * READ ONLY · in-memory snapshots
 */

const productionAcceptance = require('./productionAcceptanceService');

const LAYER = 'P0E_GO_LIVE_REGISTRY';
const MAX_SNAPSHOTS = 48;

const _snapshots = [];

function buildRegistryEntry(report) {
  return {
    timestamp: report.generated_at,
    activation: report.go_live
      ? {
          go_live_detected: report.go_live.go_live_detected,
          activation_timestamp: report.go_live.activation_timestamp,
          first_ioe_at: report.go_live.first_ioe_at,
          first_delivery_at: report.go_live.first_outbox_delivery_at
        }
      : null,
    first_24h: report.first_24h
      ? {
          first_24h_stable: report.first_24h.first_24h_stable,
          ioe_per_hour: report.first_24h.ioe_per_hour,
          deliveries_per_hour: report.first_24h.deliveries_per_hour
        }
      : null,
    first_72h: report.first_72h
      ? {
          first_72h_stable: report.first_72h.first_72h_stable,
          throughput_ioe_per_hour: report.first_72h.throughput_ioe_per_hour,
          active_tenants: report.first_72h.active_tenants
        }
      : null,
    acceptance: {
      production_accepted: report.production_accepted ?? false,
      verdict: report.verdict,
      pass: report.pass
    },
    summary: report.summary
  };
}

async function collectAndRegisterSnapshot(db, options = {}) {
  const report = await productionAcceptance.generateProductionAcceptance({ db, ...options });
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
