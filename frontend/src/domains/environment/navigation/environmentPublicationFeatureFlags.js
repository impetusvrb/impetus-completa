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

export function isEnvironmentNavigationRuntimeEnabled() {
  return (
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED')) ||
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_NAVIGATION_ENABLED'))
  );
}

export function isEnvironmentPublicationRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED'));
}

export function isEnvironmentGovernanceVisibilityEnabled() {
  return (
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED')) ||
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_VISIBILITY_ENABLED'))
  );
}

export function isEnvironmentExecutiveVisibilityEnabled() {
  return (
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_VISIBILITY_ENABLED')) ||
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED'))
  );
}

export function isEnvironmentOperationalVisibilityEnabled() {
  return (
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED')) ||
    truthy(envVite('VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_VISIBILITY_ENABLED'))
  );
}

export function isEnvironmentAudiencePreviewMode() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_PUBLICATION_AUDIENCE_PREVIEW'));
}

export function getEnvironmentPublicationFlagSnapshot() {
  return {
    navigation: isEnvironmentNavigationRuntimeEnabled(),
    publication: isEnvironmentPublicationRuntimeEnabled(),
    governance_visible: isEnvironmentGovernanceVisibilityEnabled(),
    executive_visible: isEnvironmentExecutiveVisibilityEnabled(),
    operational_visible: isEnvironmentOperationalVisibilityEnabled(),
    audience_preview: isEnvironmentAudiencePreviewMode()
  };
}
