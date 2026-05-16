'use strict';

/**
 * WAVE 7 — Workflow Permission Matrix.
 * Cross-reference: workflowType × role × capabilities → decisão.
 * Consolida workflowCapabilityMatrix + domainCapabilityGovernance numa decisão única.
 * Modo inicial: observe (IMPETUS_WORKFLOW_PERMISSION_ENFORCE=false).
 */

const { WORKFLOW_PERMISSION_ENFORCE } = require('./governanceFlags');
const { checkWorkflowCapability, getWorkflowCapability } = require('./workflowCapabilityMatrix');
const { checkCapability, getCapabilitiesForRole } = require('./domainCapabilityGovernance');
const { evaluateAbacPolicies } = require('./abacExtension');

/**
 * Decisão completa de permissão para um workflow.
 * @param {{
 *   workflowType: string,
 *   role: string,
 *   company_id?: string,
 *   domain?: string,
 *   actor_type?: 'human'|'ai',
 *   capabilities?: string[]
 * }} request
 * @returns {{
 *   permitted: boolean,
 *   mode: 'enforce'|'observe'|'disabled',
 *   workflow_matrix: object,
 *   abac_result: object,
 *   capability_checks: object[],
 *   requires_human_approval: boolean,
 *   effective_block: boolean
 * }}
 */
function evaluateWorkflowPermission(request) {
  const { workflowType, role, company_id, domain, actor_type = 'human' } = request;
  const userCaps = Array.isArray(request.capabilities)
    ? request.capabilities
    : getCapabilitiesForRole(role).map((c) => c.capability_id);

  // 1. Workflow capability matrix check
  const matrixResult = checkWorkflowCapability(workflowType, role, { capabilities: userCaps });

  // 2. ABAC evaluation
  const wfEntry = getWorkflowCapability(workflowType);
  const abacResult = evaluateAbacPolicies(
    { role, company_id, actor_type, capabilities: userCaps, domain },
    { workflow_type: workflowType, company_id, domain: domain || (wfEntry && wfEntry.domain) }
  );

  // 3. Per-capability checks
  const capChecks = (wfEntry ? wfEntry.requiredCapabilities : []).map((capId) =>
    checkCapability(capId, role)
  );

  const allCapOk = capChecks.length === 0 || capChecks.every((c) => c.granted);
  // ABAC deny influencia `permitted` mesmo em observe mode.
  // `effective_block` é separado e depende de WORKFLOW_PERMISSION_ENFORCE.
  const abacOk = abacResult.decision !== 'deny';
  const matrixOk = matrixResult.allowed || matrixResult.mode === 'disabled' || matrixResult.mode === 'unknown';

  const permitted = matrixOk && allCapOk && abacOk;
  const mode = WORKFLOW_PERMISSION_ENFORCE ? 'enforce' : 'observe';

  if (!permitted) {
    console.warn(
      '[WORKFLOW_PERMISSION_%s] Denied — workflowType=%s role=%s actor_type=%s',
      mode.toUpperCase(), workflowType, role, actor_type
    );
  }

  return {
    permitted,
    mode,
    workflow_matrix: matrixResult,
    abac_result: { decision: abacResult.decision, violations: abacResult.violations },
    capability_checks: capChecks,
    requires_human_approval: wfEntry ? wfEntry.requiresHumanApproval : false,
    // Bloqueia efectivamente apenas em enforce mode
    effective_block: WORKFLOW_PERMISSION_ENFORCE && !permitted
  };
}

module.exports = {
  evaluateWorkflowPermission
};
