'use strict';

/**
 * AIOI-P1J.1 / P1J.4 — Production Readiness Service
 * READ ONLY · consolida readiness P1D–P1I · sem novas capacidades.
 */

const fs = require('fs');
const path = require('path');

const continuousWorker = require('./aioiContinuousWorkerService');
const horizontalActivation = require('./aioiHorizontalActivationService');
const distributedRuntime = require('./aioiDistributedRuntimeService');
const clusterHealth = require('./aioiClusterHealthService');
const distributedCapacity = require('./aioiDistributedCapacityService');
const distributedTelemetry = require('./aioiDistributedTelemetryService');
const distributedAudit = require('./aioiDistributedAuditService');
const capacityGuard = require('./aioiCapacityGuardService');
const outboxRetention = require('../lifecycle/aioiOutboxRetentionService');
const snapshotRetention = require('../lifecycle/aioiSnapshotRetentionService');
const certificationRegistry = require('./aioiCertificationRegistryService');
const operationalRisk = require('./aioiOperationalRiskService');

const LAYER = 'AIOI_PRODUCTION_READINESS';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

function _readyBlock(status, factors = {}) {
  return { ready: !!status, status: status ? 'READY' : 'NOT_READY', ...factors };
}

async function evaluateInfrastructureReadiness() {
  const telemetry = await distributedTelemetry.collectTelemetry();
  const ownership = telemetry.shards?.ownership_validation || {};
  const cluster = telemetry.cluster || {};

  const ready = ownership.pass !== false
    && (telemetry.leases?.p1a_lock_preserved !== false)
    && (telemetry.leases?.coordination_ready !== false);

  return _readyBlock(ready, {
    worker_count: telemetry.workers?.worker_count || 1,
    shard_count: telemetry.shards?.shard_count || 1,
    ownership_conflicts: ownership.ownership_conflicts ?? 0,
    p1a_lock_preserved: telemetry.leases?.p1a_lock_preserved ?? true,
    coordination_ready: cluster.coordination?.mode != null || telemetry.leases?.coordination_ready
  });
}

async function evaluateRuntimeReadiness() {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  const flags = horizontalActivation.getActivationFlags();
  const ws = continuousWorker.getWorkerStatus();

  const invariantsOk = !inv.runtime_enabled
    && !inv.runtime_active
    && !inv.cognitive_execution_allowed
    && inv.auto_execute_band === 'none';

  const ready = invariantsOk && inv.runtime_authorized === false;

  return _readyBlock(ready, {
    invariants_preserved: invariantsOk,
    invariants: inv,
    activation_flags: flags,
    worker_status: {
      enabled: ws.worker_enabled,
      run_count: ws.run_count,
      last_error: ws.last_error
    },
    distributed_active: distributedRuntime.isDistributedActive()
  });
}

async function evaluateRecoveryReadiness() {
  const soak = distributedRuntime.getDistributedSoakMetrics();
  const failoverState = distributedRuntime.getDistributedOwnershipState()?.failover || {};

  const ready = soak.ownership_conflicts === 0
    && soak.lease_conflicts === 0
    && soak.lost === 0
    && soak.duplicates === 0;

  return _readyBlock(ready, {
    ownership_conflicts: soak.ownership_conflicts,
    lease_conflicts: soak.lease_conflicts,
    lost: soak.lost,
    duplicates: soak.duplicates,
    failover_available: typeof distributedRuntime.certifyLeaseFailover === 'function',
    last_failover: failoverState
  });
}

async function evaluateCapacityReadiness() {
  const capacity = await distributedCapacity.calculateDistributedCapacity();
  const guard = await capacityGuard.generateCapacityStatus();

  const ready = capacity.recommended_workers >= 1
    && capacity.recommended_shards >= 1
    && capacity.headroom_percent >= 0;

  return _readyBlock(ready, {
    headroom_percent: capacity.headroom_percent,
    headroom_status: capacity.headroom_status,
    capacity_guard_status: guard.overall_status,
    recommended_workers: capacity.recommended_workers,
    recommended_shards: capacity.recommended_shards,
    current_tenants: capacity.current_tenants
  });
}

async function evaluateGovernanceReadiness() {
  const registry = certificationRegistry.getCertificationStatus();
  const risk = await operationalRisk.assessOperationalRisk();

  const ready = registry.registry_ready
    && risk.governance_risk !== 'CRITICAL'
    && risk.runtime_risk !== 'CRITICAL';

  return _readyBlock(ready, {
    certification_registry_ready: registry.registry_ready,
    phases_certified: registry.phases.filter(p => p.certified).length,
    dependency_chain_valid: registry.dependency_chain_valid,
    governance_risk: risk.governance_risk,
    overall_risk: risk.overall_risk
  });
}

async function conductProductionAudit() {
  const blocking = [];
  const warnings = [];

  const inv = continuousWorker.RUNTIME_INVARIANTS;
  if (inv.runtime_enabled || inv.cognitive_execution_allowed) {
    blocking.push({ area: 'invariants', code: 'INV_RUNTIME', message: 'Runtime/cognitive invariant violation' });
  }
  if (inv.auto_execute_band !== 'none') {
    blocking.push({ area: 'invariants', code: 'INV_AUTO_EXEC', message: 'auto_execute_band must be none' });
  }

  const registry = certificationRegistry.getCertificationStatus();
  if (!registry.all_phases_certified) {
    warnings.push({ area: 'certification', code: 'REG_INCOMPLETE', message: 'Not all P1A–P1I docs present' });
  }
  if (!registry.dependency_chain_valid) {
    blocking.push({ area: 'certification', code: 'REG_DEPS', message: 'Phase dependency chain broken' });
  }

  let p1dLifecycle = { outbox_retention: false, snapshot_retention: false };
  try {
    p1dLifecycle = {
      outbox_retention: typeof outboxRetention.retentionDryRun === 'function',
      snapshot_retention: typeof snapshotRetention.retentionDryRun === 'function',
      doc_present: fs.existsSync(path.join(DOCS_DIR, 'AIOI_P1D_ENTERPRISE_RUNTIME_HARDENING.md'))
    };
  } catch {
    warnings.push({ area: 'P1D', code: 'P1D_LIFECYCLE', message: 'Lifecycle services unavailable' });
  }

  const p1gFlags = horizontalActivation.getActivationFlags();
  const p1gOk = typeof horizontalActivation.resolveActiveTenants === 'function';

  const p1hOk = typeof distributedRuntime.getDistributedStatus === 'function'
    && typeof distributedRuntime.validateShardOwnership === 'function';

  const p1iTelemetry = await distributedTelemetry.collectTelemetry();
  const p1iAudit = distributedAudit.getAuditSummary();
  const p1iOk = !!p1iTelemetry.workers && !!p1iTelemetry.shards;

  if (!p1gOk) blocking.push({ area: 'P1G', code: 'P1G_MISSING', message: 'Horizontal activation unavailable' });
  if (!p1hOk) blocking.push({ area: 'P1H', code: 'P1H_MISSING', message: 'Distributed runtime unavailable' });
  if (!p1iOk) warnings.push({ area: 'P1I', code: 'P1I_TELEMETRY', message: 'Distributed telemetry incomplete' });

  const health = await clusterHealth.evaluateClusterHealth();
  if (health.overall_status === 'CRITICAL') {
    warnings.push({ area: 'health', code: 'CLUSTER_CRITICAL', message: 'Cluster health CRITICAL (observation)' });
  }

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    blocking_issues: blocking,
    warnings,
    ready_for_production: blocking.length === 0,
    audit_scope: {
      p1d_lifecycle: p1dLifecycle,
      p1g_activation: { ok: p1gOk, flags: p1gFlags },
      p1h_distributed: { ok: p1hOk, active: distributedRuntime.isDistributedActive() },
      p1i_operations: { ok: p1iOk, audit_events: p1iAudit.total_events }
    },
    timestamp: new Date().toISOString()
  };
}

function _readinessScore(sections) {
  const keys = ['infrastructure', 'runtime', 'recovery', 'capacity', 'governance'];
  const ready = keys.filter(k => sections[k]?.ready).length;
  return Math.round((ready / keys.length) * 100);
}

async function generateProductionReadiness() {
  const infrastructure = await evaluateInfrastructureReadiness();
  const runtime = await evaluateRuntimeReadiness();
  const recovery = await evaluateRecoveryReadiness();
  const capacity = await evaluateCapacityReadiness();
  const governance = await evaluateGovernanceReadiness();
  const audit = await conductProductionAudit();

  const sections = { infrastructure, runtime, recovery, capacity, governance };
  const allReady = Object.values(sections).every(s => s.ready);
  const overallReady = allReady && audit.ready_for_production;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    auto_action: false,
    overall_ready: overallReady,
    readiness_score: _readinessScore(sections),
    infrastructure,
    runtime,
    recovery,
    capacity,
    governance,
    production_audit: audit,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  evaluateInfrastructureReadiness,
  evaluateRuntimeReadiness,
  evaluateRecoveryReadiness,
  evaluateCapacityReadiness,
  evaluateGovernanceReadiness,
  conductProductionAudit,
  generateProductionReadiness,
  LAYER
};
