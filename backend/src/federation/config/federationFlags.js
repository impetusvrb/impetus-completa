'use strict';

/**
 * Enterprise Federation flags — OIDC · SAML · SCIM
 * additive-only · shadow-first · pilot rollout
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
  isFederationEnabled: () => _flag('IMPETUS_FEDERATION_ENABLED', false),
  federationMode: () => _mode('IMPETUS_FEDERATION_MODE', 'shadow'),
  isOidcEnabled: () => _flag('IMPETUS_FEDERATION_OIDC_ENABLED', true),
  isSamlEnabled: () => _flag('IMPETUS_FEDERATION_SAML_ENABLED', true),
  isScimEnabled: () => _flag('IMPETUS_FEDERATION_SCIM_ENABLED', true),
  federationPilotOnly: () => {
    const enterprise = require('../../services/enterprise/enterpriseSecurityRolloutService');
    return enterprise.resolvePilotOnly(process.env.IMPETUS_FEDERATION_PILOT_ONLY, true);
  },
  federationPilotTenants: () => {
    const raw = process.env.IMPETUS_FEDERATION_PILOT_TENANTS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },
  federationBaseUrl: () => {
    const raw = (
      process.env.IMPETUS_FEDERATION_BASE_URL ||
      process.env.IMPETUS_API_BASE_URL ||
      process.env.BASE_URL ||
      'http://localhost:4000'
    ).trim().replace(/\/$/, '');
    return raw;
  },
  invariants: Object.freeze({
    password_login_preserved: true,
    tenant_isolated: true,
    rbac_preserved: true,
    hierarchy_preserved: true,
    rollback_safe: true,
    shadow_first: true,
  }),
};
