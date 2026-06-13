'use strict';

/**
 * AIOI-P1I.4 — Distributed Capacity Planning
 * READ ONLY · sem decisões automáticas.
 *
 * Baseado em limites P1C/P1G/P1H.
 */

const tenantRegistry = require('./aioiTenantRegistryService');
const distributedRuntime = require('./aioiDistributedRuntimeService');
const distributedTelemetry = require('./aioiDistributedTelemetryService');
const capacityGuard = require('./aioiCapacityGuardService');

const LAYER = 'AIOI_DISTRIBUTED_CAPACITY';

const P1C_SAFE_TENANTS = 3;
const P1C_MAX_THROUGHPUT_PER_WORKER = 3600;
const TENANTS_PER_SHARD_TARGET = 25;

async function calculateDistributedCapacity() {
  const registry = tenantRegistry.loadRegisteredTenants();
  const tenantCount = registry.tenants.length || P1C_SAFE_TENANTS;
  const currentWorkers = distributedRuntime.getWorkerCount();
  const shardMetrics = distributedTelemetry.collectShardMetrics();
  const currentShards = shardMetrics.shard_count || 1;
  const capacity = await capacityGuard.generateCapacityStatus();
  const throughput = distributedTelemetry.collectThroughputMetrics();

  const recommendedShards = Math.max(1, Math.ceil(tenantCount / TENANTS_PER_SHARD_TARGET));
  const recommendedWorkers = Math.min(
    recommendedShards,
    Math.max(1, Math.ceil(tenantCount / P1C_SAFE_TENANTS))
  );

  const maxCapacity = currentWorkers * P1C_MAX_THROUGHPUT_PER_WORKER;
  const currentLoad = throughput.events_processed || 0;
  const headroom = maxCapacity > 0
    ? +Math.max(0, ((maxCapacity - currentLoad) / maxCapacity) * 100).toFixed(1)
    : 100;

  let headroomStatus = 'NORMAL';
  if (headroom < 20) headroomStatus = 'CRITICAL';
  else if (headroom < 40) headroomStatus = 'HIGH';
  else if (headroom < 60) headroomStatus = 'WARNING';

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    auto_action: false,
    current_workers: currentWorkers,
    current_tenants: tenantCount,
    current_shards: currentShards,
    recommended_workers: recommendedWorkers,
    recommended_shards: recommendedShards,
    headroom_percent: headroom,
    headroom_status: headroomStatus,
    p1c_safe_tenants: P1C_SAFE_TENANTS,
    capacity_guard_status: capacity.overall_status,
    distributed_active: distributedRuntime.isDistributedActive(),
    methodology: 'P1C/P1G/P1H derived — observation only',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  calculateDistributedCapacity,
  LAYER,
  P1C_SAFE_TENANTS
};
