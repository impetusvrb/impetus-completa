'use strict';

const flags = require('../config/federationFlags');

function getEffectiveMode(providerMode) {
  const global = flags.federationMode();
  if (global === 'off' || !flags.isFederationEnabled()) return 'off';
  const pm = String(providerMode || 'shadow').toLowerCase();
  const order = { off: 0, shadow: 1, audit: 2, on: 3 };
  const g = order[global] ?? 1;
  const p = order[pm] ?? 1;
  const min = Math.min(g, p);
  return Object.keys(order).find((k) => order[k] === min) || 'shadow';
}

function isActiveForTenant(companyId) {
  if (!flags.isFederationEnabled()) return false;
  if (!companyId) return false;
  if (!flags.federationPilotOnly()) return true;
  const pilots = flags.federationPilotTenants();
  return pilots.length > 0 && pilots.includes(String(companyId));
}

function canIssueSession(effectiveMode) {
  return effectiveMode === 'on';
}

function shouldTrace(effectiveMode) {
  return effectiveMode !== 'off' && flags.isFederationEnabled();
}

function isShadowOnly(effectiveMode) {
  return effectiveMode === 'shadow';
}

function assertTenantAccess(companyId, userCompanyId) {
  if (!companyId || !userCompanyId) return { ok: false, code: 'TENANT_REQUIRED' };
  if (String(companyId) !== String(userCompanyId)) {
    return { ok: false, code: 'TENANT_ISOLATION_VIOLATION' };
  }
  return { ok: true };
}

function getDiagnostics() {
  return {
    enabled: flags.isFederationEnabled(),
    mode: flags.federationMode(),
    oidc: flags.isOidcEnabled(),
    saml: flags.isSamlEnabled(),
    scim: flags.isScimEnabled(),
    pilot_only: flags.federationPilotOnly(),
    pilot_tenants: flags.federationPilotTenants(),
    base_url: flags.federationBaseUrl(),
    invariants: flags.invariants,
  };
}

module.exports = {
  getEffectiveMode,
  isActiveForTenant,
  canIssueSession,
  shouldTrace,
  isShadowOnly,
  assertTenantAccess,
  getDiagnostics,
};
