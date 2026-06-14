'use strict';

/**
 * AIOI-P1N.3 — Governance Compliance Service
 * READ ONLY · valida P1K/P1M governance.
 */

const deploymentGovernance = require('./aioiDeploymentGovernanceService');
const authGovernance = require('./aioiAuthorizationGovernanceService');
const deploymentApproval = require('./aioiDeploymentApprovalService');
const rolloutRegistry = require('./aioiProductionRolloutRegistryService');
const authAudit = require('./aioiAuthorizationAuditService');
const continuousReadiness = require('./aioiContinuousReadinessService');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_GOVERNANCE_COMPLIANCE';

async function validateDeploymentGovernance() {
  const status = await deploymentGovernance.generateDeploymentGovernanceStatus();
  return {
    ok: status.ok && status.auto_deploy === false,
    auto_deploy: status.auto_deploy,
    approval_required: status.approval_required,
    registry_ready: status.rollout_registry?.registry_ready
  };
}

function validateAuthorizationGovernance() {
  const status = authGovernance.getAuthorizationStatus();
  return {
    ok: status.runtime_authorized === false && status.auto_authorize === false,
    runtime_authorized: status.runtime_authorized,
    auto_authorize: status.auto_authorize,
    policy_count: status.policies?.length || 0
  };
}

function validateApprovalCompliance() {
  const deploy = deploymentApproval.getApprovalStatus();
  return {
    ok: deploy.auto_approval === false && deploy.framework_ready === true,
    auto_approval: deploy.auto_approval,
    framework_ready: deploy.framework_ready
  };
}

function validateAuditCompleteness() {
  const auth = authAudit.verifyAuditIntegrity();
  const rollout = rolloutRegistry.getRolloutStatus();
  return {
    ok: auth.audit_integrity === true,
    auth_audit_entries: auth.entries,
    rollout_registry_ready: rollout.registry_ready
  };
}

async function validateReadinessGovernance() {
  const check = await continuousReadiness.runContinuousReadinessCheck();
  return {
    ok: check.check?.invariants_preserved === true,
    invariants_preserved: check.check?.invariants_preserved,
    readiness_score: check.check?.readiness_score
  };
}

async function generateComplianceStatus() {
  const deployment = await validateDeploymentGovernance();
  const authorization = validateAuthorizationGovernance();
  const approval = validateApprovalCompliance();
  const audit = validateAuditCompleteness();
  const readiness = await validateReadinessGovernance();

  const checks = [deployment, authorization, approval, audit, readiness];
  const passed = checks.filter(c => c.ok).length;
  const complianceScore = Math.round((passed / checks.length) * 100);

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    compliance_score: complianceScore,
    governance_compliance_ready: complianceScore === 100,
    checks: {
      deployment_governance: deployment,
      authorization_governance: authorization,
      approval_compliance: approval,
      audit_completeness: audit,
      readiness_governance: readiness
    },
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateDeploymentGovernance,
  validateAuthorizationGovernance,
  validateApprovalCompliance,
  validateAuditCompleteness,
  generateComplianceStatus,
  LAYER
};
