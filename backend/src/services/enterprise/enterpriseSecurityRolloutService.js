'use strict';

/**
 * M1.19 — Enterprise Security Rollout (GLOBAL-01)
 * Centraliza modo enterprise enforced vs pilot-only para RLS, MFA e Federation.
 */

const rlsFlags = require('../../tenant-isolation/config/tenantRlsFlags');
const mfaFlags = require('../../mfa/config/mfaFlags');
const fedFlags = require('../../federation/config/federationFlags');
const rlsGov = require('../../tenant-isolation/governance/tenantRlsGovernanceService');
const mfaGov = require('../../mfa/governance/mfaGovernanceService');
const fedGov = require('../../federation/governance/federationGovernanceService');

function _envBool(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function isEnterpriseSecurityRolloutActive() {
  return _envBool('IMPETUS_ENTERPRISE_SECURITY_ROLLOUT', false);
}

/** Quando rollout activo, pilot_only é ignorado — enforcement enterprise-wide. */
function resolvePilotOnly(envValue, legacyDefault = true) {
  if (isEnterpriseSecurityRolloutActive()) return false;
  if (envValue == null || envValue === '') return legacyDefault;
  return envValue === 'on' || envValue === 'true' || envValue === '1';
}

function getEnterpriseSecurityStatus() {
  const rollout = isEnterpriseSecurityRolloutActive();
  return {
    enterprise_security_rollout_active: rollout,
    enterprise_rls_enabled:
      rlsFlags.isRlsEnabled() && rlsFlags.rlsMode() === 'on' && (!rlsFlags.rlsPilotOnly() || rollout),
    enterprise_mfa_enabled:
      mfaFlags.isMfaEnabled() && mfaFlags.mfaMode() === 'on' && (!mfaFlags.mfaPilotOnly() || rollout),
    enterprise_federation_enabled:
      fedFlags.isFederationEnabled() &&
      fedFlags.federationMode() === 'on' &&
      (!fedFlags.federationPilotOnly() || rollout),
    rls: rlsGov.getDiagnostics(),
    mfa: mfaGov.getDiagnostics(),
    federation: fedGov.getDiagnostics(),
  };
}

function assertEnterpriseSecurityRolloutComplete() {
  const status = getEnterpriseSecurityStatus();
  const ok =
    status.enterprise_rls_enabled &&
    status.enterprise_mfa_enabled &&
    status.enterprise_federation_enabled;
  return { ok, ...status };
}

module.exports = {
  isEnterpriseSecurityRolloutActive,
  resolvePilotOnly,
  getEnterpriseSecurityStatus,
  assertEnterpriseSecurityRolloutComplete,
};
