function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isSafetyTelemetryRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_SAFETY_TELEMETRY_RUNTIME_ENABLED);
}
