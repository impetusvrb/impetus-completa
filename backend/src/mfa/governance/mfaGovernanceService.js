'use strict';

const flags = require('../config/mfaFlags');

function getEffectiveMode(policyMode) {
  const global = flags.mfaMode();
  if (global === 'off' || !flags.isMfaEnabled()) return 'off';
  const pm = String(policyMode || 'shadow').toLowerCase();
  const order = { off: 0, shadow: 1, audit: 2, on: 3 };
  const g = order[global] ?? 1;
  const p = order[pm] ?? 1;
  const min = Math.min(g, p);
  return Object.keys(order).find((k) => order[k] === min) || 'shadow';
}

function isActiveForTenant(companyId) {
  if (!flags.isMfaEnabled()) return false;
  if (!companyId) return false;
  if (!flags.mfaPilotOnly()) return true;
  const pilots = flags.mfaPilotTenants();
  return pilots.length > 0 && pilots.includes(String(companyId));
}

function shouldEnforceChallenge(effectiveMode) {
  return effectiveMode === 'on';
}

function shouldAuditOnly(effectiveMode) {
  return effectiveMode === 'audit';
}

function isShadowOnly(effectiveMode) {
  return effectiveMode === 'shadow';
}

function getDiagnostics() {
  return {
    enabled: flags.isMfaEnabled(),
    mode: flags.mfaMode(),
    totp: flags.isTotpEnabled(),
    webauthn: flags.isWebAuthnEnabled(),
    backup_codes: flags.isBackupCodesEnabled(),
    device_trust: flags.isDeviceTrustEnabled(),
    device_trust_days: flags.deviceTrustDays(),
    pilot_only: flags.mfaPilotOnly(),
    pilot_tenants: flags.mfaPilotTenants(),
    rp_id: flags.rpId(),
    invariants: flags.invariants,
  };
}

module.exports = {
  getEffectiveMode,
  isActiveForTenant,
  shouldEnforceChallenge,
  shouldAuditOnly,
  isShadowOnly,
  getDiagnostics,
};
