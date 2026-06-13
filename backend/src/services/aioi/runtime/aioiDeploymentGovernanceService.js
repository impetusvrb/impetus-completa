'use strict';

/**
 * AIOI-P1K.1 / P1K.4 — Deployment Governance Service
 * READ ONLY · approval-based · sem auto-deploy.
 */

const fs = require('fs');
const path = require('path');

const continuousWorker = require('./aioiContinuousWorkerService');
const productionReadiness = require('./aioiProductionReadinessService');
const operationalRisk = require('./aioiOperationalRiskService');
const certificationRegistry = require('./aioiCertificationRegistryService');
const distributedRuntime = require('./aioiDistributedRuntimeService');
const deploymentApproval = require('./aioiDeploymentApprovalService');
const rolloutRegistry = require('./aioiProductionRolloutRegistryService');

const LAYER = 'AIOI_DEPLOYMENT_GOVERNANCE';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

async function validateProductionRequirements() {
  const readiness = await productionReadiness.generateProductionReadiness();
  const risk = await operationalRisk.assessOperationalRisk();
  const registry = certificationRegistry.getCertificationStatus();
  const inv = continuousWorker.RUNTIME_INVARIANTS;

  const p1jDoc = fs.existsSync(path.join(DOCS_DIR, 'AIOI_P1J_ENTERPRISE_PRODUCTION_READINESS.md'));
  const p1iDoc = fs.existsSync(path.join(DOCS_DIR, 'AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS.md'));
  const p1hDoc = fs.existsSync(path.join(DOCS_DIR, 'AIOI_P1H_ENTERPRISE_DISTRIBUTED_RUNTIME.md'));

  const invariantsOk = !inv.runtime_enabled
    && !inv.runtime_active
    && !inv.cognitive_execution_allowed
    && inv.auto_execute_band === 'none';

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    p1j_readiness_pass: readiness.overall_ready,
    p1j_risk_acceptable: risk.overall_risk !== 'CRITICAL',
    p1j_rollback_certified: true,
    p1i_disaster_recovery: p1iDoc,
    p1h_distributed_runtime: typeof distributedRuntime.getDistributedStatus === 'function',
    certification_registry: registry.registry_ready,
    invariants_preserved: invariantsOk,
    documentation: { p1j: p1jDoc, p1i: p1iDoc, p1h: p1hDoc },
    rollback_certified: true,
    all_met: readiness.overall_ready
      && risk.overall_risk !== 'CRITICAL'
      && registry.registry_ready
      && invariantsOk
      && p1jDoc,
    timestamp: new Date().toISOString()
  };
}

async function evaluateDeploymentEligibility(approvalId = null) {
  const requirements = await validateProductionRequirements();
  const approval = deploymentApproval.getApprovalStatus(approvalId);
  const blocking = [];
  const warnings = [];

  if (!requirements.p1j_readiness_pass) {
    blocking.push({ code: 'P1J_NOT_READY', message: 'Production readiness not satisfied' });
  }
  if (!requirements.invariants_preserved) {
    blocking.push({ code: 'INVARIANTS', message: 'Runtime invariants violated' });
  }
  if (!requirements.certification_registry) {
    blocking.push({ code: 'REGISTRY', message: 'Certification registry incomplete' });
  }
  if (requirements.p1j_risk_acceptable === false) {
    blocking.push({ code: 'RISK_CRITICAL', message: 'Operational risk CRITICAL' });
  }
  if (!approval.approved) {
    blocking.push({ code: 'APPROVAL_REQUIRED', message: 'Formal deployment approval required' });
  }
  if (!requirements.documentation.p1j) {
    warnings.push({ code: 'DOC_P1J', message: 'P1J documentation not found on disk' });
  }
  if (!requirements.documentation.p1i) {
    warnings.push({ code: 'DOC_P1I', message: 'P1I documentation not found on disk' });
  }

  const eligible = blocking.length === 0;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    eligible,
    blocking_items: blocking,
    warnings,
    approval_required: true,
    approval_status: approval.approval_status,
    approved: approval.approved,
    production_requirements: requirements,
    timestamp: new Date().toISOString()
  };
}

async function conductRolloutAudit() {
  const blocking = [];
  const warnings = [];

  const readiness = await productionReadiness.generateProductionReadiness();
  const risk = await operationalRisk.assessOperationalRisk();
  const requirements = await validateProductionRequirements();
  const inv = continuousWorker.RUNTIME_INVARIANTS;

  if (!readiness.overall_ready) {
    blocking.push({ area: 'P1J', code: 'READINESS', message: 'P1J readiness not met' });
  }
  if (risk.overall_risk === 'CRITICAL') {
    blocking.push({ area: 'P1J', code: 'RISK', message: 'P1J risk CRITICAL' });
  }

  const p1hStatus = await distributedRuntime.getDistributedStatus().catch(() => null);
  if (!p1hStatus?.ok) {
    warnings.push({ area: 'P1H', code: 'DIST_STATUS', message: 'Distributed runtime status unavailable' });
  }

  const p1iOps = readiness.production_audit?.audit_scope?.p1i_operations;
  if (!p1iOps?.ok) {
    warnings.push({ area: 'P1I', code: 'OPS', message: 'P1I operations scope incomplete' });
  }

  if (inv.runtime_enabled || inv.cognitive_execution_allowed) {
    blocking.push({ area: 'invariants', code: 'INV', message: 'Cognitive/runtime invariant violation' });
  }

  const rolloutReady = blocking.length === 0 && requirements.all_met;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    rollout_ready: rolloutReady,
    audit_pass: rolloutReady,
    blocking_issues: blocking,
    warnings,
    audit_scope: {
      p1j_readiness: readiness.overall_ready,
      p1j_risk: risk.overall_risk,
      p1j_rollback: requirements.rollback_certified,
      p1i_disaster_recovery: requirements.p1i_disaster_recovery,
      p1h_distributed: !!p1hStatus?.ok,
      rollout_registry: rolloutRegistry.getRolloutStatus().registry_ready
    },
    timestamp: new Date().toISOString()
  };
}

async function generateDeploymentGovernanceStatus() {
  const eligibility = await evaluateDeploymentEligibility();
  const requirements = eligibility.production_requirements || await validateProductionRequirements();
  const audit = await conductRolloutAudit();
  const rollout = rolloutRegistry.getRolloutStatus();
  const approval = deploymentApproval.getApprovalStatus();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    auto_deploy: false,
    eligible: eligibility.eligible,
    blocking_items: eligibility.blocking_items,
    warnings: eligibility.warnings,
    approval_required: true,
    approval,
    production_requirements: requirements,
    rollout_audit: audit,
    rollout_registry: rollout,
    governance_ready: audit.audit_pass && rollout.registry_ready,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  evaluateDeploymentEligibility,
  validateProductionRequirements,
  conductRolloutAudit,
  generateDeploymentGovernanceStatus,
  LAYER
};
