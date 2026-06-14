'use strict';

/**
 * AIOI-P1M.1 — Authorization Policy Registry
 * READ ONLY · define escopos, requisitos e dependências.
 */

const LAYER = 'AIOI_AUTHORIZATION_POLICY';

const POLICIES = Object.freeze([
  {
    scope: 'continuous_runtime',
    label: 'Continuous Runtime Activation',
    required_approvals: 1,
    approval_type: 'manual',
    dependencies: ['P1A', 'P1B'],
    min_approver_role: 'ops_lead',
    ttl_ms: 86_400_000,
    auto_authorize: false
  },
  {
    scope: 'horizontal_activation',
    label: 'Horizontal Scale Activation',
    required_approvals: 2,
    approval_type: 'manual',
    dependencies: ['P1E', 'P1F', 'P1G'],
    min_approver_role: 'ops_lead',
    ttl_ms: 43_200_000,
    auto_authorize: false
  },
  {
    scope: 'distributed_runtime',
    label: 'Distributed Runtime Activation',
    required_approvals: 2,
    approval_type: 'manual',
    dependencies: ['P1H', 'P1J'],
    min_approver_role: 'enterprise_ops',
    ttl_ms: 43_200_000,
    auto_authorize: false
  },
  {
    scope: 'enterprise_rollout',
    label: 'Enterprise Production Rollout',
    required_approvals: 3,
    approval_type: 'manual',
    dependencies: ['P1K', 'P1L'],
    min_approver_role: 'enterprise_ops',
    ttl_ms: 21_600_000,
    auto_authorize: false
  },
  {
    scope: 'runtime_authorization_governance',
    label: 'Runtime Authorization Governance (P1M)',
    required_approvals: 1,
    approval_type: 'manual',
    dependencies: ['P1M'],
    min_approver_role: 'governance_lead',
    ttl_ms: 3_600_000,
    auto_authorize: false
  }
]);

function getAuthorizationPolicies() {
  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    auto_authorize: false,
    policies: POLICIES.map(p => ({ ...p })),
    policy_count: POLICIES.length,
    timestamp: new Date().toISOString()
  };
}

function getPolicyForScope(scope) {
  const policy = POLICIES.find(p => p.scope === scope);
  if (!policy) {
    return { ok: false, error: 'policy_not_found', scope };
  }
  return { ok: true, layer: LAYER, policy: { ...policy } };
}

function validatePolicyRequirements(scope, approvalCount) {
  const { policy } = getPolicyForScope(scope);
  if (!policy) {
    return { valid: false, error: 'policy_not_found' };
  }
  return {
    valid: approvalCount >= policy.required_approvals,
    required_approvals: policy.required_approvals,
    current_approvals: approvalCount,
    approval_type: policy.approval_type,
    scope
  };
}

module.exports = {
  getAuthorizationPolicies,
  getPolicyForScope,
  validatePolicyRequirements,
  POLICIES,
  LAYER
};
