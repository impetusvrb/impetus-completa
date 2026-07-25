'use strict';

/**
 * SEC-21 — Production Security Activation flags.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityProductionActivationEnabled() {
  return envBool('SECURITY_PRODUCTION_ACTIVATION', false);
}

function autoPromoteOnBoot() {
  return envBool('SECURITY_PRODUCTION_ACTIVATION_AUTO_PROMOTE', false);
}

function skipInfraChecks() {
  return envBool('SEC21_SKIP_INFRA_CHECKS', false);
}

module.exports = {
  envBool,
  isSecurityProductionActivationEnabled,
  autoPromoteOnBoot,
  skipInfraChecks
};
