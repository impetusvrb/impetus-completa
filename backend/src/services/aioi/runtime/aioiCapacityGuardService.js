'use strict';

/**
 * AIOI-P1D.4 — Capacity Guard Service
 *
 * Guardrails de capacidade — SOMENTE observabilidade, sem ação automática.
 * ADDITIVE ONLY · READ ONLY · ZERO COGNIÇÃO
 *
 * Thresholds derivados de AIOI_P1C_CAPACITY_MODEL.md
 */

const aggregation = require('./aioiRuntimeAggregationService');
const outboxRetention = require('../lifecycle/aioiOutboxRetentionService');
const snapshotRetention = require('../lifecycle/aioiSnapshotRetentionService');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_CAPACITY_GUARD';

const THRESHOLDS = Object.freeze({
  BACKLOG_WARNING: 500,
  BACKLOG_HIGH: 2000,
  BACKLOG_CRITICAL: 5000,
  SNAPSHOT_EXCESS_WARNING: 500,
  SNAPSHOT_EXCESS_HIGH: 2000,
  SNAPSHOT_EXCESS_CRITICAL: 5000,
  OUTBOX_DELIVERED_WARNING: 50000,
  OUTBOX_DELIVERED_HIGH: 200000,
  OUTBOX_DELIVERED_CRITICAL: 500000,
  STORAGE_MB_WARNING: 100,
  STORAGE_MB_HIGH: 500,
  STORAGE_MB_CRITICAL: 2000
});

const STATUS = Object.freeze(['NORMAL', 'WARNING', 'HIGH', 'CRITICAL']);

function _maxStatus(...statuses) {
  const order = { NORMAL: 0, WARNING: 1, HIGH: 2, CRITICAL: 3 };
  return statuses.reduce((max, s) => (order[s] > order[max] ? s : max), 'NORMAL');
}

function _level(value, warn, high, crit) {
  if (value >= crit) return 'CRITICAL';
  if (value >= high) return 'HIGH';
  if (value >= warn) return 'WARNING';
  return 'NORMAL';
}

/**
 * Avalia pressão de backlog (outbox pending).
 * @param {number} pending
 * @returns {object}
 */
function evaluateBacklogPressure(pending = 0) {
  const p = Math.max(0, Number(pending) || 0);
  const status = _level(p, THRESHOLDS.BACKLOG_WARNING, THRESHOLDS.BACKLOG_HIGH, THRESHOLDS.BACKLOG_CRITICAL);
  return {
    metric: 'backlog_pending',
    value: p,
    status,
    thresholds: {
      warning: THRESHOLDS.BACKLOG_WARNING,
      high: THRESHOLDS.BACKLOG_HIGH,
      critical: THRESHOLDS.BACKLOG_CRITICAL
    },
    safe_limit: THRESHOLDS.BACKLOG_CRITICAL
  };
}

/**
 * Avalia pressão de snapshots (excesso acima do limite de retenção).
 * @param {number} excess
 * @returns {object}
 */
function evaluateSnapshotPressure(excess = 0) {
  const e = Math.max(0, Number(excess) || 0);
  const status = _level(e, THRESHOLDS.SNAPSHOT_EXCESS_WARNING, THRESHOLDS.SNAPSHOT_EXCESS_HIGH, THRESHOLDS.SNAPSHOT_EXCESS_CRITICAL);
  return {
    metric: 'snapshot_excess',
    value: e,
    status,
    thresholds: {
      warning: THRESHOLDS.SNAPSHOT_EXCESS_WARNING,
      high: THRESHOLDS.SNAPSHOT_EXCESS_HIGH,
      critical: THRESHOLDS.SNAPSHOT_EXCESS_CRITICAL
    },
    retention_limit: snapshotRetention.DEFAULT_RETENTION_COUNT
  };
}

/**
 * Avalia crescimento do outbox delivered acumulado.
 * @param {number} delivered
 * @returns {object}
 */
function evaluateOutboxGrowth(delivered = 0) {
  const d = Math.max(0, Number(delivered) || 0);
  const status = _level(d, THRESHOLDS.OUTBOX_DELIVERED_WARNING, THRESHOLDS.OUTBOX_DELIVERED_HIGH, THRESHOLDS.OUTBOX_DELIVERED_CRITICAL);
  return {
    metric: 'outbox_delivered',
    value: d,
    status,
    thresholds: {
      warning: THRESHOLDS.OUTBOX_DELIVERED_WARNING,
      high: THRESHOLDS.OUTBOX_DELIVERED_HIGH,
      critical: THRESHOLDS.OUTBOX_DELIVERED_CRITICAL
    },
    retention_days: outboxRetention.DEFAULT_RETENTION_DAYS
  };
}

/**
 * Gera status consolidado de capacidade.
 * @returns {Promise<object>}
 */
async function generateCapacityStatus() {
  const [agg, snapGrowth, outboxImpact] = await Promise.all([
    aggregation.getRuntimeAggregateMetrics(),
    snapshotRetention.estimateSnapshotGrowth(),
    outboxRetention.estimateRetentionImpact()
  ]);

  const pending = agg.outbox?.pending || 0;
  const delivered = agg.outbox?.delivered || 0;
  const snapshotExcess = snapGrowth.total_excess || 0;

  const storageTotalMb = (
    (agg.storage_bytes?.outbox || 0) +
    (agg.storage_bytes?.snapshots || 0) +
    (agg.storage_bytes?.ioe || 0)
  ) / (1024 * 1024);

  const backlog = evaluateBacklogPressure(pending);
  const snapshots = evaluateSnapshotPressure(snapshotExcess);
  const outbox = evaluateOutboxGrowth(delivered);
  const storageStatus = _level(
    storageTotalMb,
    THRESHOLDS.STORAGE_MB_WARNING,
    THRESHOLDS.STORAGE_MB_HIGH,
    THRESHOLDS.STORAGE_MB_CRITICAL
  );

  const overall = _maxStatus(backlog.status, snapshots.status, outbox.status, storageStatus);

  return {
    ok: true,
    layer: LAYER,
    timestamp: new Date().toISOString(),
    overall_status: overall,
    operational_only: true,
    auto_action: false,
    runtime_invariants: continuousWorker.RUNTIME_INVARIANTS,
    backlog_pressure: backlog,
    snapshot_pressure: snapshots,
    outbox_growth: outbox,
    storage: {
      total_mb: +storageTotalMb.toFixed(2),
      status: storageStatus,
      bytes: agg.storage_bytes
    },
    retention: {
      outbox_eligible_purge: outboxImpact.eligible_for_purge,
      outbox_retention_days: outboxImpact.retention_days,
      snapshot_excess: snapshotExcess,
      snapshot_retention_count: snapGrowth.retention_count
    },
    aggregates_refreshed_at: agg.refreshed_at
  };
}

module.exports = {
  evaluateBacklogPressure,
  evaluateSnapshotPressure,
  evaluateOutboxGrowth,
  generateCapacityStatus,
  THRESHOLDS,
  STATUS,
  LAYER
};
