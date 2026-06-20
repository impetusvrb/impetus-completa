'use strict';

/**
 * M1.19 — Facade MFA enterprise (GLOBAL-01)
 * Delega para mfa/governance e enterpriseSecurityRolloutService.
 */

const flags = require('../mfa/config/mfaFlags');
const gov = require('../mfa/governance/mfaGovernanceService');
const enterprise = require('./enterprise/enterpriseSecurityRolloutService');

function isEnterpriseMfaEnabled() {
  const status = enterprise.getEnterpriseSecurityStatus();
  return status.enterprise_mfa_enabled === true;
}

function isActiveForTenant(companyId) {
  return gov.isActiveForTenant(companyId);
}

function shouldEnforceChallenge(companyId, policyMode) {
  if (!isActiveForTenant(companyId)) return false;
  return gov.shouldEnforceChallenge(gov.getEffectiveMode(policyMode));
}

function getDiagnostics() {
  return {
    ...gov.getDiagnostics(),
    enterprise_mfa_enabled: isEnterpriseMfaEnabled(),
    enterprise_rollout: enterprise.isEnterpriseSecurityRolloutActive(),
  };
}

module.exports = {
  isEnterpriseMfaEnabled,
  isActiveForTenant,
  shouldEnforceChallenge,
  getDiagnostics,
  flags,
  gov,
};
