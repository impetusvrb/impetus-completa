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

export function isLogisticsOperationalRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED'));
}

export function isLogisticsRfRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_RF_RUNTIME_ENABLED'));
}

export function isLogisticsOfflineRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_OFFLINE_RUNTIME_ENABLED'));
}

export function isLogisticsKioskRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_KIOSK_RUNTIME_ENABLED'));
}
