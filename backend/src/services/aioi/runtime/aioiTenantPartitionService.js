'use strict';

/**
 * AIOI-P1E.2 — Tenant Partition Service
 *
 * Modelo de particionamento para distribuição futura por shard.
 * ADDITIVE ONLY · somente cálculo — nenhuma execução distribuída.
 *
 * Config:
 *   IMPETUS_AIOI_SHARD_COUNT=1  (default: 1 — single shard)
 *   IMPETUS_AIOI_WORKER_ID=0
 */

const tenantRegistry = require('./aioiTenantRegistryService');

const LAYER = 'AIOI_TENANT_PARTITION';

function _getShardCount() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_SHARD_COUNT || '1'), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : 1, 1), 64);
}

function _getWorkerId() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_WORKER_ID || '0'), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), 63);
}

/**
 * Calcula partição (shard) de um tenant.
 * @param {string} tenantId
 * @param {number} [shardCount]
 * @returns {number}
 */
function calculateTenantPartition(tenantId, shardCount) {
  const shards = shardCount || _getShardCount();
  const hash = tenantRegistry.getTenantHash(tenantId);
  return hash % shards;
}

/**
 * Determina quais shards um worker possui.
 * @param {number} [workerId]
 * @param {number} [shardCount]
 * @returns {number[]}
 */
function calculateWorkerOwnership(workerId, shardCount) {
  const wid = workerId !== undefined ? workerId : _getWorkerId();
  const shards = shardCount || _getShardCount();
  const totalWorkers = Math.min(
    shards,
    Math.max(parseInt(String(process.env.IMPETUS_AIOI_WORKER_COUNT || '1'), 10) || 1, 1)
  );
  const result = [];
  for (let s = 0; s < shards; s++) {
    if (s % totalWorkers === wid) result.push(s);
  }
  return result.length ? result : [0];
}

/**
 * Mapa completo tenant → shard → worker.
 * @returns {object}
 */
function getPartitionAssignments() {
  const shardCount = _getShardCount();
  const workerId = _getWorkerId();
  const tenants = tenantRegistry.getActiveTenants();
  const workerCount = Math.min(shardCount, parseInt(String(process.env.IMPETUS_AIOI_WORKER_COUNT || '1'), 10) || 1);

  const shards = Array.from({ length: shardCount }, (_, i) => ({
    shard_id: i,
    worker_id: i % workerCount,
    tenants: []
  }));

  for (const tid of tenants) {
    const partition = calculateTenantPartition(tid, shardCount);
    if (shards[partition]) {
      shards[partition].tenants.push(tid);
    }
  }

  const ownedShards = calculateWorkerOwnership(workerId, shardCount);

  return {
    layer: LAYER,
    shard_count: shardCount,
    worker_id: workerId,
    worker_count: workerCount,
    owned_shards: ownedShards,
    total_tenants: tenants.length,
    shards,
    mode: 'calculation_only',
    distributed_execution: false
  };
}

module.exports = {
  calculateTenantPartition,
  calculateWorkerOwnership,
  getPartitionAssignments,
  LAYER
};
