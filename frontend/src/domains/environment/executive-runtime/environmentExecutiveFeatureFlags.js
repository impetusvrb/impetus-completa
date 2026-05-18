function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isEnvironmentExecutiveRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED);
}

export function getEnvironmentExecutiveFlagSnapshot() {
  return { executive_runtime: isEnvironmentExecutiveRuntimeEnabled() };
}
