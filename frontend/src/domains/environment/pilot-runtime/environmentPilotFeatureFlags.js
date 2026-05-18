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

export function isEnvironmentPilotRolloutEnabled() {
  return (
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED')) &&
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED'))
  );
}
