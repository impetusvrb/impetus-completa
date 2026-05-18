function truthy(v) {
  return v === 'true' || v === '1' || v === true;
}

function envVite(key) {
  try {
    return import.meta.env && import.meta.env[key];
  } catch {
    return undefined;
  }
}

export function isEnvironmentOperationalRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED'));
}

export function isEnvironmentOfflineRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_OFFLINE_RUNTIME_ENABLED'));
}

export function isEnvironmentScannerRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_SCANNER_RUNTIME_ENABLED'));
}

export function isEnvironmentRealtimeRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_REALTIME_RUNTIME_ENABLED'));
}

export function isEnvironmentMobileRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_MOBILE_RUNTIME_ENABLED'));
}

export function isEnvironmentAttachmentRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_ATTACHMENT_RUNTIME_ENABLED'));
}

export function isEnvironmentKioskRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_KIOSK_RUNTIME_ENABLED'));
}

export function isEnvironmentRfRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_RF_RUNTIME_ENABLED'));
}

export function isUltraLowBandwidthMode() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_ULTRA_LOW_BANDWIDTH'));
}
