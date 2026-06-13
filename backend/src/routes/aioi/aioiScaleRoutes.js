'use strict';

/**
 * AIOI-P1E.7 — Scale API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const tenantRegistry = require('../../services/aioi/runtime/aioiTenantRegistryService');
const partitionSvc = require('../../services/aioi/runtime/aioiTenantPartitionService');
const coordination = require('../../services/aioi/runtime/aioiWorkerCoordinationService');
const parallelExec = require('../../services/aioi/runtime/aioiParallelExecutionService');
const continuousWorker = require('../../services/aioi/runtime/aioiContinuousWorkerService');
const capacityGuard = require('../../services/aioi/runtime/aioiCapacityGuardService');
const validationMetrics = require('../../services/aioi/runtime/aioiHorizontalValidationMetricsService');
const horizontalActivation = require('../../services/aioi/runtime/aioiHorizontalActivationService');
const distributedRuntime = require('../../services/aioi/runtime/aioiDistributedRuntimeService');
const distributedTelemetry = require('../../services/aioi/runtime/aioiDistributedTelemetryService');
const distributedAudit = require('../../services/aioi/runtime/aioiDistributedAuditService');
const clusterHealth = require('../../services/aioi/runtime/aioiClusterHealthService');
const distributedCapacity = require('../../services/aioi/runtime/aioiDistributedCapacityService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/status', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const registry = tenantRegistry.loadRegisteredTenants();
    const validation = tenantRegistry.validateTenantRegistry();
    const partitions = partitionSvc.getPartitionAssignments();
    const cluster = await coordination.getClusterStatus();
    const capacity = await capacityGuard.generateCapacityStatus();

    const shardCount = partitions.shard_count || 1;
    const tenantCount = registry.tenants.length;
    const estimatedCapacityPerHour = tenantCount * 100 * (3600 / 30);

    return res.json({
      ok: true,
      layer: 'AIOI_HORIZONTAL_SCALE',
      runtime_mode: 'operational_only',
      read_only: true,
      invariants_preserved: true,
      runtime_invariants: continuousWorker.RUNTIME_INVARIANTS,
      tenant_registry: {
        ...registry,
        validation_ok: validation.ok,
        tenant_count: tenantCount
      },
      partitions: {
        shard_count: partitions.shard_count,
        worker_id: partitions.worker_id,
        owned_shards: partitions.owned_shards,
        mode: partitions.mode
      },
      coordination: {
        mode: cluster.mode,
        coordination_ready: cluster.coordination_ready,
        distributed_active: cluster.distributed_active,
        p1a_lock_preserved: true
      },
      execution_mode: String(process.env.IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION || 'false').toLowerCase() === 'true'
        ? 'PARALLEL' : 'SEQUENTIAL',
      capacity_status: capacity.overall_status,
      estimated_scale: {
        tenants_active: tenantCount,
        safe_tenants_p1c: 3,
        registry_max: parseInt(process.env.IMPETUS_AIOI_TENANT_REGISTRY_MAX || '100', 10),
        estimated_events_per_hour: estimatedCapacityPerHour,
        horizontal_ready: validation.ok && cluster.coordination_ready
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/partitions', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const assignments = partitionSvc.getPartitionAssignments();
    return res.json({ ok: true, ...assignments });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/workers', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const cluster = await coordination.getClusterStatus();
    const benchmark = await parallelExec.benchmarkExecutionModes();
    const workerStatus = continuousWorker.getWorkerStatus();

    return res.json({
      ok: true,
      layer: 'AIOI_SCALE_WORKERS',
      cluster,
      certified_worker: {
        worker_running: workerStatus.worker_running,
        run_count: workerStatus.run_count,
        advisory_lock_key: continuousWorker.ADVISORY_LOCK_KEY,
        unchanged: true
      },
      execution_benchmark: {
        tenant_count: benchmark.tenant_count,
        sequential_ms: benchmark.sequential?.elapsed_ms,
        parallel_ms: benchmark.parallel?.elapsed_ms,
        speedup_factor: benchmark.speedup_factor,
        production_mode: benchmark.production_mode
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/validation', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const status = await validationMetrics.getValidationStatus();
    return res.json({ ok: true, ...status });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/leases', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const leases = await validationMetrics.collectLeaseMetrics();
    const cluster = await coordination.getClusterStatus();
    return res.json({
      ok: true,
      layer: 'AIOI_SCALE_LEASES',
      mode: 'shadow',
      read_only: true,
      lease_metrics: leases,
      cluster,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/ownership', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const ownership = validationMetrics.collectOwnershipMetrics();
    const assignments = partitionSvc.getPartitionAssignments();
    return res.json({
      ok: true,
      layer: 'AIOI_SCALE_OWNERSHIP',
      mode: 'shadow',
      read_only: true,
      ownership_metrics: ownership,
      current_assignments: {
        shard_count: assignments.shard_count,
        worker_id: assignments.worker_id,
        owned_shards: assignments.owned_shards,
        shards: assignments.shards
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/runtime', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const runtime = await horizontalActivation.getRuntimeStatus();
    return res.json(runtime);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/registry', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const registry = await horizontalActivation.getRegistryStatus();
    return res.json(registry);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/benchmark', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const parallel = await horizontalActivation.runParallelBenchmark();
    const runtime = await horizontalActivation.runRuntimeBenchmark();
    const distributed = await distributedRuntime.runDistributedBenchmark();
    return res.json({
      ok: true,
      layer: 'AIOI_SCALE_BENCHMARK',
      read_only: true,
      production_parallel_flag: horizontalActivation.isParallelActive(),
      parallel_benchmark: parallel,
      runtime_benchmark: runtime,
      distributed_benchmark: distributed,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/distributed', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const status = await distributedRuntime.getDistributedStatus();
    return res.json(status);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/telemetry', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await distributedTelemetry.collectTelemetry());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/health', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await clusterHealth.evaluateClusterHealth());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/capacity', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await distributedCapacity.calculateDistributedCapacity());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/audit', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const limit = parseInt(req.query.limit || '100', 10);
    const trail = distributedAudit.getAuditTrail({ limit });
    return res.json({ ok: true, summary: distributedAudit.getAuditSummary(), ...trail });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
