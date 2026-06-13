'use strict';

/**
 * AIOI-P1E.4 — Parallel Tenant Execution Engine
 *
 * Benchmark sequential vs parallel — NÃO altera worker certificado P1A.
 * Modo padrão: SEQUENTIAL
 *
 * Config:
 *   IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION=false
 */

const classification = require('../aioiClassificationConsumerService');
const tenantRegistry = require('./aioiTenantRegistryService');

const LAYER = 'AIOI_PARALLEL_EXECUTION';

function _isParallelEnabled() {
  return String(process.env.IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION || 'false').toLowerCase() === 'true';
}

function _getBatchSize() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_OUTBOX_BATCH_SIZE || '10'), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : 10, 1), 100);
}

/**
 * Executa handler por tenant em sequência.
 * @param {object} opts
 * @param {string[]} opts.tenantIds
 * @param {Function} opts.handler — async (tenantId) => result
 * @returns {Promise<object>}
 */
async function executeSequential({ tenantIds, handler }) {
  const start = Date.now();
  const results = [];
  for (const tid of tenantIds) {
    const t0 = Date.now();
    const result = await handler(tid);
    results.push({ tenant_id: tid, elapsed_ms: Date.now() - t0, result });
  }
  return {
    mode: 'SEQUENTIAL',
    tenant_count: tenantIds.length,
    elapsed_ms: Date.now() - start,
    results
  };
}

/**
 * Executa handler por tenant em paralelo (Promise.all).
 * @param {object} opts
 * @param {string[]} opts.tenantIds
 * @param {Function} opts.handler
 * @returns {Promise<object>}
 */
async function executeParallel({ tenantIds, handler }) {
  const start = Date.now();
  const promises = tenantIds.map(async (tid) => {
    const t0 = Date.now();
    const result = await handler(tid);
    return { tenant_id: tid, elapsed_ms: Date.now() - t0, result };
  });
  const results = await Promise.all(promises);
  return {
    mode: 'PARALLEL',
    tenant_count: tenantIds.length,
    elapsed_ms: Date.now() - start,
    results
  };
}

/**
 * Handler padrão: batch classification vazio/leve por tenant.
 */
async function _defaultTenantHandler(tenantId) {
  return classification.processClassificationBatch({
    companyId: tenantId,
    batchSize: _getBatchSize()
  });
}

/**
 * Executa com modo configurado (SEQUENTIAL default).
 * @param {object} [opts]
 * @param {string[]} [opts.tenantIds]
 * @param {Function} [opts.handler]
 * @returns {Promise<object>}
 */
async function executeWithConfiguredMode({ tenantIds, handler } = {}) {
  const ids = tenantIds || tenantRegistry.getActiveTenants();
  const fn = handler || _defaultTenantHandler;
  if (_isParallelEnabled()) {
    return executeParallel({ tenantIds: ids, handler: fn });
  }
  return executeSequential({ tenantIds: ids, handler: fn });
}

/**
 * Benchmark sequential vs parallel.
 * @param {object} [opts]
 * @param {string[]} [opts.tenantIds]
 * @returns {Promise<object>}
 */
async function benchmarkExecutionModes({ tenantIds } = {}) {
  const ids = tenantIds || tenantRegistry.getActiveTenants();
  const handler = _defaultTenantHandler;

  const sequential = await executeSequential({ tenantIds: ids, handler });
  const parallel = await executeParallel({ tenantIds: ids, handler });

  const speedup = sequential.elapsed_ms > 0
    ? +(sequential.elapsed_ms / parallel.elapsed_ms).toFixed(2)
    : 1;

  return {
    layer: LAYER,
    tenant_count: ids.length,
    parallel_flag_enabled: _isParallelEnabled(),
    production_mode: _isParallelEnabled() ? 'PARALLEL' : 'SEQUENTIAL',
    sequential,
    parallel,
    speedup_factor: speedup,
    recommendation: speedup > 1.2
      ? 'Parallel may reduce cycle time when flag enabled'
      : 'Sequential sufficient at current tenant count',
    alters_certified_worker: false
  };
}

module.exports = {
  executeSequential,
  executeParallel,
  executeWithConfiguredMode,
  benchmarkExecutionModes,
  LAYER
};
