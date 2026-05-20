'use strict';

const { logFinalReview } = require('./finalReviewLogger');

const PHASE_CHECKS = [
  { phase: 'E', path: 'policyEngine/index', export: 'resolveContentExposure' },
  { phase: 'F', path: 'policyEngine/config/phaseFFeatureFlags', export: 'isGovernanceShadowModeEnabled' },
  { phase: 'G', path: 'explainability/config/phaseGFeatureFlags', export: 'isGovernanceExplainabilityEnabled' },
  { phase: 'H', path: 'governanceReadiness/governanceReadinessEngine', export: 'assessReadiness' },
  { phase: 'I', path: 'governanceActivation/governanceActivationRuntime', export: 'promoteChannel' },
  { phase: 'J', path: 'governanceOperations/governanceOperationsService', export: 'getOperationsStatus' }
];

function _loadPhase(check) {
  try {
    const mod = require(`../${check.path}`);
    if (check.export && typeof mod[check.export] !== 'function') {
      return { ok: false, reason: `export_missing:${check.export}` };
    }
    return { ok: true, mod };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function auditRegression(ctx = {}) {
  const results = [];
  let regressions = 0;

  for (const check of PHASE_CHECKS) {
    const loaded = _loadPhase(check);
    results.push({
      phase: check.phase,
      path: check.path,
      integrated: loaded.ok,
      reason: loaded.ok ? null : loaded.reason
    });
    if (!loaded.ok) regressions++;
  }

  const deny_first = _checkDenyFirstPrecedence();
  const tenant_isolation = _checkTenantIsolation();
  const audit_integrity = _checkAuditFeed();

  if (!deny_first.ok) regressions++;
  if (!tenant_isolation.ok) regressions++;
  if (!audit_integrity.ok) regressions++;

  if (regressions > 0) {
    logFinalReview('FINAL_GOVERNANCE_REGRESSION_DETECTED', {
      count: regressions,
      phases: results.filter((r) => !r.integrated)
    });
  }

  return {
    phase_integration: results,
    deny_first_precedence: deny_first,
    tenant_isolation: tenant_isolation,
    audit_integrity: audit_integrity,
    regression_count: regressions,
    passed: regressions === 0,
    auto_activation: false
  };
}

function _checkDenyFirstPrecedence() {
  try {
    const { SAFE_MINIMAL_EXPOSURE } = require('../policyEngine/policies/safeMinimalPolicy');
    const hasDeny = SAFE_MINIMAL_EXPOSURE && typeof SAFE_MINIMAL_EXPOSURE === 'object';
    return { ok: hasDeny, rule: 'deny_first_safe_minimal' };
  } catch {
    return { ok: false, rule: 'safe_minimal_unavailable' };
  }
}

function _checkTenantIsolation() {
  try {
    const iso = require('../governanceActivation/tenantActivationIsolation');
    return {
      ok: typeof iso.tenantAllowsChannel === 'function' && typeof iso.isolateTenant === 'function',
      rule: 'tenant_activation_isolation'
    };
  } catch {
    return { ok: false, rule: 'tenant_isolation_unavailable' };
  }
}

function _checkAuditFeed() {
  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    return {
      ok: typeof audit.append === 'function' && typeof audit.appendActivation === 'function',
      rule: 'audit_append_only'
    };
  } catch {
    return { ok: false, rule: 'audit_feed_unavailable' };
  }
}

module.exports = { auditRegression, PHASE_CHECKS };
