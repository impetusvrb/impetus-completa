'use strict';

/**
 * M1.20 — Workflow permission gate (runtime enforcement)
 * Integra workflowPermissionMatrix no orchestrator.
 */

const { evaluateWorkflowPermission } = require('../../governance/workflowPermissionMatrix');
const { WORKFLOW_PERMISSION_ENFORCE, WORKFLOW_CAPABILITY_MATRIX_ENABLED } = require('../../governance/governanceFlags');

function _resolveWorkflowType(processKey) {
  const key = String(processKey || '').trim();
  const map = {
    'governance.approval_chain.v1': 'governance.approval',
    'quality.inspection.v1': 'quality.inspection',
    'safety.risk_assessment.v1': 'safety.risk_assessment',
    'operational.kpi_update.v1': 'operational.kpi_update',
  };
  return map[key] || key.replace(/\.v\d+$/, '');
}

function _resolveDomain(processKey) {
  const p = String(processKey || '');
  if (p.startsWith('quality.')) return 'quality';
  if (p.startsWith('safety.')) return 'safety';
  if (p.startsWith('environment.')) return 'environment';
  if (p.startsWith('governance.')) return 'governance';
  return 'operational';
}

/**
 * @param {{ user, processKey, companyId, capabilities? }} ctx
 */
function assertWorkflowPermission(ctx) {
  const user = ctx.user || {};
  const processKey = ctx.processKey;
  const workflowType = _resolveWorkflowType(processKey);

  const decision = evaluateWorkflowPermission({
    workflowType,
    role: user.role || 'operator',
    company_id: ctx.companyId || user.company_id,
    domain: _resolveDomain(processKey),
    actor_type: 'human',
    capabilities: ctx.capabilities || user.permissions || [],
  });

  if (decision.effective_block) {
    return {
      ok: false,
      code: 'WORKFLOW_PERMISSION_DENIED',
      reason: 'workflow_permission_denied',
      decision,
    };
  }

  return { ok: true, decision };
}

function getWorkflowSecurityDiagnostics() {
  return {
    workflow_permission_enforced: WORKFLOW_PERMISSION_ENFORCE === true,
    workflow_capability_matrix_enabled: WORKFLOW_CAPABILITY_MATRIX_ENABLED === true,
    mode: WORKFLOW_PERMISSION_ENFORCE ? 'enforce' : 'observe',
  };
}

module.exports = {
  assertWorkflowPermission,
  getWorkflowSecurityDiagnostics,
  _resolveWorkflowType,
};
