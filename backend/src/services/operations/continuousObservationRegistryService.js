'use strict';

/**
 * P0B.6 — Continuous Observation Registry Service
 * READ ONLY · OBSERVATIONAL ONLY · in-memory snapshots (sem mutação BD)
 */

const observationSvc = require('./continuousOperationObservationService');

const LAYER = 'P0B_CONTINUOUS_OBSERVATION_REGISTRY';
const MAX_SNAPSHOTS = 48;

const _snapshots = [];

function buildRegistryEntry(observation) {
  const s = observation.summary || {};
  return {
    timestamp: observation.generated_at,
    observation_window_days: observation.observation_window_days,
    ioe_per_hour: s.ioe_per_hour ?? 0,
    ioe_per_day: s.ioe_per_day ?? 0,
    outbox_delivery_rate: s.outbox_delivery_rate_pct ?? 0,
    active_tenants: s.active_tenants ?? 0,
    workflow_count: observation.workflows?.total_instances ?? 0,
    tri_ai_status: s.tri_ai_status ?? 'UNKNOWN',
    platform_status: s.platform_status ?? 'unknown',
    continuous_operation_active: observation.continuous_operation_active,
    observation_status: s.observation_status ?? 'ACTIVE'
  };
}

/**
 * Colecta snapshot observacional e regista em memória (ring buffer).
 */
async function collectAndRegisterSnapshot(db, options = {}) {
  const observation = await observationSvc.generateContinuousObservation({
    db,
    windowDays: options.windowDays
  });
  const entry = buildRegistryEntry(observation);

  _snapshots.unshift(entry);
  if (_snapshots.length > MAX_SNAPSHOTS) {
    _snapshots.length = MAX_SNAPSHOTS;
  }

  return {
    layer: LAYER,
    mode: 'OBSERVATIONAL_READ_ONLY',
    registry_size: _snapshots.length,
    latest: entry,
    observation
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
