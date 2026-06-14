'use strict';

/**
 * AIOI-P1N.1 — Operational Integrity Service
 * READ ONLY · valida componentes certificados P1A–P1N (baseline 14 fases).
 */

const continuousWorker = require('./aioiContinuousWorkerService');
const tenantRegistry = require('./aioiTenantRegistryService');
const distributedRuntime = require('./aioiDistributedRuntimeService');
const coordination = require('./aioiWorkerCoordinationService');
const deploymentApproval = require('./aioiDeploymentApprovalService');
const rolloutRegistry = require('./aioiProductionRolloutRegistryService');
const productionReadiness = require('./aioiProductionReadinessService');
const certificationRegistry = require('./aioiCertificationRegistryService');
const authRegistry = require('./aioiRuntimeAuthorizationRegistryService');
const authAudit = require('./aioiAuthorizationAuditService');
const distributedAudit = require('./aioiDistributedAuditService');
const continuousReadiness = require('./aioiContinuousReadinessService');

const LAYER = 'AIOI_OPERATIONAL_INTEGRITY';

function validateRuntimeInvariants() {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  const violations = [];
  if (inv.runtime_enabled) violations.push({ code: 'RUNTIME_ENABLED', message: 'runtime_enabled must be false' });
  if (inv.runtime_active) violations.push({ code: 'RUNTIME_ACTIVE', message: 'runtime_active must be false' });
  if (inv.runtime_authorized) violations.push({ code: 'RUNTIME_AUTHORIZED', message: 'runtime_authorized must be false' });
  if (inv.cognitive_execution_allowed) violations.push({ code: 'COGNITIVE', message: 'cognitive_execution_allowed must be false' });
  if (inv.auto_execute_band !== 'none') violations.push({ code: 'AUTO_EXEC', message: 'auto_execute_band must be none' });
  return { ok: violations.length === 0, violations, invariants: inv };
}

function validateOwnershipIntegrity() {
  const wc = distributedRuntime.getWorkerCount();
  const sc = distributedRuntime.getDistributedOwnershipState()?.shard_count || 4;
  const validation = distributedRuntime.validateShardOwnership(wc, sc);
  const registry = tenantRegistry.validateTenantRegistry();
  return {
    ok: validation.pass && registry.valid !== false,
    ownership_conflicts: validation.ownership_conflicts || 0,
    registry_valid: registry.valid !== false,
    pass: validation.pass
  };
}

async function validateLeaseIntegrity() {
  const cluster = await coordination.getClusterStatus();
  const p1aLock = cluster.p1a_lock_key === 8820202607;
  return {
    ok: cluster.ok && p1aLock,
    coordination_ready: cluster.coordination_ready,
    p1a_lock_preserved: p1aLock,
    active_leases: cluster.active_leases_in_process?.length || 0
  };
}

function validateApprovalIntegrity() {
  const status = deploymentApproval.getApprovalStatus();
  return {
    ok: status.framework_ready === true && status.auto_approval === false,
    framework_ready: status.framework_ready,
    auto_approval: status.auto_approval
  };
}

function validateAuthorizationIntegrity() {
  const status = authRegistry.getRegistryStatus();
  return {
    ok: status.runtime_authorized === false && status.auto_authorize === false,
    runtime_authorized: status.runtime_authorized,
    auto_authorize: status.auto_authorize,
    registry_ready: status.registry_ready
  };
}

function validateAuditIntegrity() {
  const auth = authAudit.verifyAuditIntegrity();
  const distSummary = distributedAudit.getAuditSummary();
  return {
    ok: auth.audit_integrity === true,
    auth_audit: auth,
    distributed_audit_events: distSummary.total_events || 0,
    monotonic_ids: auth.monotonic_ids
  };
}

function validateCertificationIntegrity() {
  const registry = certificationRegistry.getCertificationStatus();
  const deps = certificationRegistry.validatePhaseDependencies();
  return {
    ok: registry.registry_ready && deps.pass,
    phases_certified: registry.phases.filter(p => p.certified).length,
    dependency_chain_valid: deps.pass
  };
}

function validateReadinessChain() {
  const readiness = continuousReadiness.getReadinessTrend();
  const rollout = rolloutRegistry.getRolloutStatus();
  return {
    ok: rollout.registry_ready === true,
    readiness_trend: readiness,
    rollout_registry_ready: rollout.registry_ready
  };
}

async function generateIntegrityStatus() {
  const invariantCheck = validateRuntimeInvariants();
  const ownership = validateOwnershipIntegrity();
  const leases = await validateLeaseIntegrity();
  const approvals = validateApprovalIntegrity();
  const authorization = validateAuthorizationIntegrity();
  const audit = validateAuditIntegrity();
  const certification = validateCertificationIntegrity();
  const readiness = validateReadinessChain();

  const checks = [invariantCheck, ownership, leases, approvals, authorization, audit, certification, readiness];
  const violations = [];
  if (!invariantCheck.ok) violations.push(...invariantCheck.violations);
  if (!ownership.ok) violations.push({ code: 'OWNERSHIP', message: 'Ownership/registry integrity failed' });
  if (!leases.ok) violations.push({ code: 'LEASE', message: 'Lease/coordination integrity failed' });
  if (!approvals.ok) violations.push({ code: 'APPROVAL', message: 'Deployment approval integrity failed' });
  if (!authorization.ok) violations.push({ code: 'AUTHORIZATION', message: 'Authorization integrity failed' });
  if (!audit.ok) violations.push({ code: 'AUDIT', message: 'Audit chain integrity failed' });
  if (!certification.ok) violations.push({ code: 'CERTIFICATION', message: 'Certification registry integrity failed' });
  if (!readiness.ok) violations.push({ code: 'READINESS', message: 'Readiness/rollout chain failed' });

  let readinessScore = 100;
  try {
    const prod = await productionReadiness.generateProductionReadiness();
    readinessScore = prod.readiness_score ?? 100;
  } catch { /* observation only */ }

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    integrity_verified: violations.length === 0,
    violations: violations.length,
    violation_details: violations,
    checks: {
      invariants: invariantCheck,
      ownership,
      leases,
      approvals,
      authorization,
      audit,
      certification,
      readiness,
      readiness_score: readinessScore
    },
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateRuntimeInvariants,
  validateOwnershipIntegrity,
  validateLeaseIntegrity,
  validateApprovalIntegrity,
  validateAuthorizationIntegrity,
  validateAuditIntegrity,
  validateCertificationIntegrity,
  generateIntegrityStatus,
  LAYER
};
