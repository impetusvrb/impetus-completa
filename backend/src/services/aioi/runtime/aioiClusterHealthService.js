'use strict';

/**
 * AIOI-P1I.3 — Cluster Health Service
 * READ ONLY · observação · sem ação automática.
 */

const capacityGuard = require('./aioiCapacityGuardService');
const distributedRuntime = require('./aioiDistributedRuntimeService');
const distributedTelemetry = require('./aioiDistributedTelemetryService');
const coordination = require('./aioiWorkerCoordinationService');

const LAYER = 'AIOI_CLUSTER_HEALTH';

function _maxStatus(...statuses) {
  const order = { NORMAL: 0, WARNING: 1, HIGH: 2, CRITICAL: 3 };
  return statuses.reduce((max, s) => (order[s] > order[max] ? s : max), 'NORMAL');
}

function _statusFlags(overall) {
  return {
    NORMAL: overall === 'NORMAL',
    WARNING: overall === 'WARNING',
    HIGH: overall === 'HIGH',
    CRITICAL: overall === 'CRITICAL'
  };
}

async function evaluateClusterHealth() {
  const capacity = await capacityGuard.generateCapacityStatus();
  const ownership = distributedRuntime.getDistributedOwnershipState();
  const wc = distributedRuntime.getWorkerCount();
  const sc = ownership.shard_count || 1;

  const validation = distributedRuntime.validateShardOwnership(wc, sc);
  const ownershipCoverage = validation.pass ? 'NORMAL' : 'CRITICAL';

  let leaseAgeStatus = 'NORMAL';
  const cluster = await coordination.getClusterStatus();
  for (const l of cluster.active_leases_in_process || []) {
    if (l.acquired_at) {
      const ageMs = Date.now() - new Date(l.acquired_at).getTime();
      if (ageMs > 300_000) leaseAgeStatus = _maxStatus(leaseAgeStatus, 'WARNING');
      if (ageMs > 600_000) leaseAgeStatus = _maxStatus(leaseAgeStatus, 'HIGH');
    }
  }

  const workerStatus = distributedRuntime.isDistributedActive() && wc > 1 ? 'NORMAL' : 'NORMAL';
  const workerModule = require('./aioiContinuousWorkerService');
  const ws = workerModule.getWorkerStatus();
  const workerAvailability = ws.worker_enabled && !ws.last_error ? 'NORMAL' : 'WARNING';

  const shardMetrics = distributedTelemetry.collectShardMetrics();
  const balanceStatus = shardMetrics.tenant_total <= shardMetrics.shard_count ? 'NORMAL'
    : shardMetrics.balance_ratio >= 0.5 ? 'NORMAL'
    : shardMetrics.balance_ratio >= 0.3 ? 'WARNING' : 'HIGH';

  const backlogStatus = capacity.backlog_pressure?.status || 'NORMAL';

  const overall = _maxStatus(
    ownershipCoverage,
    leaseAgeStatus,
    workerAvailability,
    balanceStatus,
    backlogStatus,
    capacity.overall_status || 'NORMAL'
  );

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    overall_status: overall,
    states: _statusFlags(overall),
    factors: {
      ownership_coverage: { status: ownershipCoverage, pass: validation.pass },
      lease_age: { status: leaseAgeStatus },
      worker_availability: { status: workerAvailability, worker_running: ws.worker_running },
      shard_balance: { status: balanceStatus, balance_ratio: shardMetrics.balance_ratio },
      backlog_pressure: capacity.backlog_pressure || { status: backlogStatus }
    },
    auto_action: false,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  evaluateClusterHealth,
  LAYER
};
