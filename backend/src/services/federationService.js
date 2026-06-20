'use strict';

/**
 * M1.19 — Facade Federation/SSO enterprise (GLOBAL-01)
 */

const flags = require('../federation/config/federationFlags');
const gov = require('../federation/governance/federationGovernanceService');
const enterprise = require('./enterprise/enterpriseSecurityRolloutService');

function isEnterpriseFederationEnabled() {
  const status = enterprise.getEnterpriseSecurityStatus();
  return status.enterprise_federation_enabled === true;
}

function isActiveForTenant(companyId) {
  return gov.isActiveForTenant(companyId);
}

function assertTenantAccess(companyId, userCompanyId) {
  return gov.assertTenantAccess(companyId, userCompanyId);
}

function getDiagnostics() {
  return {
    ...gov.getDiagnostics(),
    enterprise_federation_enabled: isEnterpriseFederationEnabled(),
    enterprise_rollout: enterprise.isEnterpriseSecurityRolloutActive(),
  };
}

module.exports = {
  isEnterpriseFederationEnabled,
  isActiveForTenant,
  assertTenantAccess,
  getDiagnostics,
  flags,
  gov,
};
