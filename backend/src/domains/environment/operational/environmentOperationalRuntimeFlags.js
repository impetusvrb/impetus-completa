'use strict';

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isEnvironmentOperationalRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED', false);
}

function isEnvironmentOfflineRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_OFFLINE_RUNTIME_ENABLED', false);
}

function isEnvironmentScannerRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_SCANNER_RUNTIME_ENABLED', false);
}

function isEnvironmentRealtimeRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_REALTIME_RUNTIME_ENABLED', false);
}

function isEnvironmentMobileRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_MOBILE_RUNTIME_ENABLED', false);
}

function isEnvironmentAttachmentRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_ATTACHMENT_RUNTIME_ENABLED', false);
}

function isEnvironmentKioskRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_KIOSK_RUNTIME_ENABLED', false);
}

function getOperationalRuntimeFlagSnapshot() {
  return {
    operational: isEnvironmentOperationalRuntimeEnabled(),
    offline: isEnvironmentOfflineRuntimeEnabled(),
    scanner: isEnvironmentScannerRuntimeEnabled(),
    realtime: isEnvironmentRealtimeRuntimeEnabled(),
    mobile: isEnvironmentMobileRuntimeEnabled(),
    attachment: isEnvironmentAttachmentRuntimeEnabled(),
    kiosk: isEnvironmentKioskRuntimeEnabled()
  };
}

module.exports = {
  isEnvironmentOperationalRuntimeEnabled,
  isEnvironmentOfflineRuntimeEnabled,
  isEnvironmentScannerRuntimeEnabled,
  isEnvironmentRealtimeRuntimeEnabled,
  isEnvironmentMobileRuntimeEnabled,
  isEnvironmentAttachmentRuntimeEnabled,
  isEnvironmentKioskRuntimeEnabled,
  getOperationalRuntimeFlagSnapshot
};
