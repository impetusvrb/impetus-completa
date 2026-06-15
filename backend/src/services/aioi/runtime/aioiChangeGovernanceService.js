'use strict';

/**
 * AIOI-P1R.3 — Change Governance Validation
 * READ ONLY · valida freeze, requisitos de certificação e governança de mudanças.
 */

const baselineFreeze = require('./aioiBaselineFreezeService');
const deploymentGovernance = require('./aioiDeploymentGovernanceService');
const deploymentApproval = require('./aioiDeploymentApprovalService');
const baselineRegistry = require('./aioiBaselineRegistryService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_CHANGE_GOVERNANCE';

async function validateChangeGovernance() {
  const freeze = baselineFreeze.generateFreezeStatus();
  const registry = baselineRegistry.getBaselineRegistry();
  const deploy = await deploymentGovernance.generateDeploymentGovernanceStatus();
  const approval = deploymentApproval.getApprovalStatus();

  const changeGovernanceValid = freeze.baseline_frozen === true
    && freeze.governance_only === true
    && freeze.operational_block === false
    && registry.baseline_registered === true
    && registry.chain?.phases_present === ENTERPRISE_BASELINE_PHASE_COUNT
    && deploy.auto_deploy === false
    && deploy.approval_required === true
    && approval.auto_approval === false
    && approval.framework_ready === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    change_governance_valid: changeGovernanceValid,
    checks: {
      baseline_frozen: freeze.baseline_frozen,
      governance_only: freeze.governance_only,
      registry_complete: registry.baseline_registered,
      auto_deploy_disabled: deploy.auto_deploy === false,
      approval_required: deploy.approval_required === true,
      manual_approval: approval.auto_approval === false
    },
    freeze_policy: freeze.freeze_policy,
    certification_requirement: 'Alterações em componentes certificados requerem nova certificação formal',
    freeze,
    registry,
    deployment: deploy,
    approval,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateChangeGovernance,
  LAYER
};
