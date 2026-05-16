/**
 * Flags Vite — Quality Industrial Telemetry Runtime (Etapa 4). Default false.
 */
function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isQualityTelemetryRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED);
}

export function getQualityTelemetryFlagSnapshot() {
  return {
    telemetry_runtime: isQualityTelemetryRuntimeEnabled()
  };
}
