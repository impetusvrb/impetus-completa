'use strict';

/**
 * APPSEC-01 — Feature flags da camada Enterprise Application Security.
 * Aditivo; não altera SEC-01→SEC-21C.
 */

function envBool(name, defaultValue = true) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

function isProduction() {
  return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
}

function isAppsecEnabled() {
  return envBool('IMPETUS_APPSEC_ENABLED', true);
}

function isCrossTenantValidatorEnabled() {
  return isAppsecEnabled() && envBool('IMPETUS_APPSEC_CROSS_TENANT', true);
}

function isSsrfEngineEnabled() {
  return isAppsecEnabled() && envBool('IMPETUS_APPSEC_SSRF', true);
}

function isPublicEndpointPolicyEnabled() {
  return isAppsecEnabled() && envBool('IMPETUS_APPSEC_PUBLIC_ENDPOINTS', true);
}

function isSecretManagementEnabled() {
  return isAppsecEnabled() && envBool('IMPETUS_APPSEC_SECRET_MGMT', true);
}

function isRuntimeConfigValidatorEnabled() {
  return isAppsecEnabled() && envBool('IMPETUS_APPSEC_RUNTIME_CONFIG', true);
}

function isUploadSecurityStrict() {
  return isAppsecEnabled() && envBool('IMPETUS_APPSEC_UPLOAD_STRICT', true);
}

module.exports = {
  envBool,
  isProduction,
  isAppsecEnabled,
  isCrossTenantValidatorEnabled,
  isSsrfEngineEnabled,
  isPublicEndpointPolicyEnabled,
  isSecretManagementEnabled,
  isRuntimeConfigValidatorEnabled,
  isUploadSecurityStrict
};
