/**
 * Flags Vite — Environment Industrial Telemetry Runtime (Etapa 3). Default false.
 */
function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isEnvironmentTelemetryRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED);
}

export function isEnvironmentTelemetryEdgeEnabled() {
  return (
    isEnvironmentTelemetryRuntimeEnabled() &&
    envTrue(import.meta.env.VITE_IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED)
  );
}

export function getEnvironmentTelemetryFlagSnapshot() {
  return {
    telemetry_runtime: isEnvironmentTelemetryRuntimeEnabled(),
    edge: isEnvironmentTelemetryEdgeEnabled()
  };
}
