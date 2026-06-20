'use strict';

/**
 * M1.19 — Enterprise tenant RLS middleware facade (GLOBAL-01)
 */

const flags = require('../tenant-isolation/config/tenantRlsFlags');
const gov = require('../tenant-isolation/governance/tenantRlsGovernanceService');
const enterprise = require('../services/enterprise/enterpriseSecurityRolloutService');
const { tenantRlsContext } = require('./tenantRlsMiddleware');

function isEnterpriseRlsEnabled() {
  const status = enterprise.getEnterpriseSecurityStatus();
  return status.enterprise_rls_enabled === true;
}

function isActiveForTenant(companyId) {
  return gov.isActiveForTenant(companyId);
}

function getDiagnostics() {
  return {
    ...gov.getDiagnostics(),
    enterprise_rls_enabled: isEnterpriseRlsEnabled(),
    enterprise_rollout: enterprise.isEnterpriseSecurityRolloutActive(),
  };
}

module.exports = {
  tenantRlsContext,
  isEnterpriseRlsEnabled,
  isActiveForTenant,
  getDiagnostics,
  flags,
  gov,
};
