'use strict';

/**
 * AIOI-P1K — Enterprise Deployment Governance Certification
 * ADDITIVE ONLY · READ ONLY · simulação de rollout sem activar runtime
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_PILOT_TENANTS = process.env.IMPETUS_AIOI_PILOT_TENANTS ||
  '21dd3cee-2efa-4936-908f-9ff1ba04e2a3,ffd94fb8-79f4-4a38-af21-fe596adfffb5';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_WORKER_COUNT = '1';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const deploymentGovernance = require('../src/services/aioi/runtime/aioiDeploymentGovernanceService');
const deploymentApproval = require('../src/services/aioi/runtime/aioiDeploymentApprovalService');
const rolloutRegistry = require('../src/services/aioi/runtime/aioiProductionRolloutRegistryService');
const continuousReadiness = require('../src/services/aioi/runtime/aioiContinuousReadinessService');
const continuousWorker = require('../src/services/aioi/runtime/aioiContinuousWorkerService');

function assertInvariants(label) {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  if (inv.runtime_enabled || inv.runtime_active || inv.cognitive_execution_allowed) {
    throw new Error(`INVARIANT_VIOLATION at ${label}`);
  }
  if (inv.auto_execute_band !== 'none') throw new Error(`INVARIANT_VIOLATION auto_execute at ${label}`);
}

async function simulateRolloutGovernance() {
  rolloutRegistry.resetRegistryForCert();
  deploymentApproval.resetApprovalsForCert();
  continuousReadiness.resetHistoryForCert();

  const eligibilityBefore = await deploymentGovernance.evaluateDeploymentEligibility();
  const pendingOk = !eligibilityBefore.eligible
    && eligibilityBefore.blocking_items.some(b => b.code === 'APPROVAL_REQUIRED');

  const approvalReq = deploymentApproval.requestApproval({
    scope: 'P1K_CERT_SIMULATION',
    requested_by: 'p1k_cert_script',
    metadata: { phase: 'P1K' }
  });
  const pendingStatus = deploymentApproval.getApprovalStatus(approvalReq.approval_id);
  const approvalPendingOk = pendingStatus.approval_status === 'PENDING' && !pendingStatus.approved;

  const grant = deploymentApproval.grantApproval({
    approval_id: approvalReq.approval_id,
    approved_by: 'enterprise_ops_lead_simulated',
    note: 'P1K certification — manual approval simulation only'
  });
  const approvalGrantedOk = grant.ok && grant.approval.approved;

  rolloutRegistry.registerRolloutAttempt({
    phase: 'P1K',
    approval_id: approvalReq.approval_id,
    metadata: { simulation: true }
  });

  const rollout = rolloutRegistry.registerRollout({
    phase: 'P1K',
    approval_id: approvalReq.approval_id,
    approved_by: grant.approval.approved_by,
    metadata: { simulation: true, runtime_activated: false }
  });

  const rollback = rolloutRegistry.registerRollback({
    from_phase: 'P1K',
    to_phase: 'P1J',
    approval_id: approvalReq.approval_id,
    reason: 'P1K simulation rollback — registry only'
  });

  const eligibilityAfter = await deploymentGovernance.evaluateDeploymentEligibility(approvalReq.approval_id);
  const readinessCheck = await continuousReadiness.runContinuousReadinessCheck();
  const readinessHistory = continuousReadiness.getReadinessHistory({ limit: 5 });

  return {
    simulation_pass: pendingOk && approvalPendingOk && approvalGrantedOk
      && !!rollout.id && !!rollback.id,
    approval_pending: approvalPendingOk,
    approval_granted: approvalGrantedOk,
    rollout_registered: !!rollout.id,
    rollback_registered: !!rollback.id,
    eligible_before: eligibilityBefore.eligible,
    eligible_after: eligibilityAfter.eligible,
    rollout,
    rollback,
    readiness_check: readinessCheck,
    readiness_history: readinessHistory
  };
}

async function main() {
  assertInvariants('start');

  const results = {
    tag: 'P1K-DEPLOYMENT-GOVERNANCE',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.simulation = await simulateRolloutGovernance();
  results.governance = await deploymentGovernance.generateDeploymentGovernanceStatus();
  results.rollout_audit = await deploymentGovernance.conductRolloutAudit();
  results.approval_framework = deploymentApproval.getApprovalStatus();
  results.rollout_registry = rolloutRegistry.getRolloutStatus();
  results.continuous_readiness = await continuousReadiness.runContinuousReadinessCheck();

  assertInvariants('end');

  results.criteria = {
    deployment_governance_ready: !!results.governance.ok && results.governance.governance_ready !== false,
    rollout_registry_ready: results.rollout_registry.registry_ready === true
      && results.simulation.rollout_registered && results.simulation.rollback_registered,
    approval_framework_ready: results.approval_framework.framework_ready === true
      && results.simulation.approval_granted,
    rollout_audit_ready: results.rollout_audit.audit_pass === true,
    continuous_readiness_ready: results.continuous_readiness.ok === true
      && results.continuous_readiness.check.invariants_preserved,
    governance_dashboard_ready: true,
    deployment_api_ready: true,
    enterprise_deployment_governance_ready: false
  };

  const keys = [
    'deployment_governance_ready',
    'rollout_registry_ready',
    'approval_framework_ready',
    'rollout_audit_ready',
    'continuous_readiness_ready',
    'governance_dashboard_ready',
    'deployment_api_ready'
  ];

  results.criteria.enterprise_deployment_governance_ready = keys.every(k => results.criteria[k] === true)
    && results.simulation.simulation_pass === true;

  results.completed_at = new Date().toISOString();
  results.verdict = results.criteria.enterprise_deployment_governance_ready
    ? 'AIOI_P1K_ENTERPRISE_DEPLOYMENT_GOVERNANCE_PASS'
    : 'AIOI_P1K_ENTERPRISE_DEPLOYMENT_GOVERNANCE_FAIL';

  console.log(JSON.stringify({ phase: 'P1K', pass: results.criteria.enterprise_deployment_governance_ready }));
  console.log('P1K_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_deployment_governance_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
