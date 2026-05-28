'use strict';

/**
 * Enterprise MFA flags — TOTP · WebAuthn · Backup · Device Trust
 */

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultVal = 'shadow') {
  const v = String(process.env[name] || defaultVal).trim().toLowerCase();
  if (['off', 'shadow', 'audit', 'on'].includes(v)) return v;
  return defaultVal;
}

module.exports = {
  isMfaEnabled: () => _flag('IMPETUS_MFA_ENABLED', false),
  mfaMode: () => _mode('IMPETUS_MFA_MODE', 'shadow'),
  isTotpEnabled: () => _flag('IMPETUS_MFA_TOTP_ENABLED', true),
  isWebAuthnEnabled: () => _flag('IMPETUS_MFA_WEBAUTHN_ENABLED', true),
  isBackupCodesEnabled: () => _flag('IMPETUS_MFA_BACKUP_CODES_ENABLED', true),
  isDeviceTrustEnabled: () => _flag('IMPETUS_MFA_DEVICE_TRUST_ENABLED', true),
  deviceTrustDays: () => {
    const v = parseInt(process.env.IMPETUS_MFA_DEVICE_TRUST_DAYS || '14', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 90) : 14;
  },
  mfaPilotOnly: () => {
    const v = process.env.IMPETUS_MFA_PILOT_ONLY;
    if (v == null || v === '') return true;
    return v === 'on' || v === 'true' || v === '1';
  },
  mfaPilotTenants: () => {
    const raw = process.env.IMPETUS_MFA_PILOT_TENANTS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },
  rpId: () => {
    const raw = process.env.IMPETUS_MFA_WEBAUTHN_RP_ID || process.env.IMPETUS_FEDERATION_BASE_URL || '';
    try {
      if (raw.startsWith('http')) return new URL(raw).hostname;
      return raw.replace(/\/$/, '') || 'localhost';
    } catch {
      return 'localhost';
    }
  },
  rpOrigin: () => {
    return (
      process.env.IMPETUS_MFA_WEBAUTHN_ORIGIN ||
      process.env.IMPETUS_CLIENT_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000'
    ).trim().replace(/\/$/, '');
  },
  challengeTtlMinutes: () => {
    const v = parseInt(process.env.IMPETUS_MFA_CHALLENGE_TTL_MINUTES || '10', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 30) : 10;
  },
  invariants: Object.freeze({
    password_login_preserved: true,
    rollback_safe: true,
    tenant_isolated: true,
    rbac_preserved: true,
    hierarchy_preserved: true,
    shadow_first: true,
  }),
};
