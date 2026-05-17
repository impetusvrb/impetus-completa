function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isSafetyOperationalRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED);
}

export function isSafetyKioskRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_SAFETY_KIOSK_RUNTIME_ENABLED);
}

export function getOperationalRuntimeSnapshot() {
  return {
    operational: isSafetyOperationalRuntimeEnabled(),
    kiosk: isSafetyKioskRuntimeEnabled()
  };
}
