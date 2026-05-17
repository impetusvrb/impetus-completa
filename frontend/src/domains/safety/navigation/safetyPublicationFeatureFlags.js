/**
 * Publicação do domínio SAFETY (SST) — flags Vite (default off, rollback-safe).
 */
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

export function isSafetyNavigationRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_SAFETY_NAVIGATION_ENABLED'));
}

export function isSafetyPublicationRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_SAFETY_PUBLICATION_RUNTIME_ENABLED'));
}

export function isSafetyGovernanceVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_SAFETY_GOVERNANCE_VISIBILITY_ENABLED'));
}

export function isSafetyExecutiveVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_SAFETY_EXECUTIVE_VISIBILITY_ENABLED'));
}

export function isSafetyOperationalVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_SAFETY_OPERATIONAL_VISIBILITY_ENABLED'));
}

export function isSafetyAudiencePreviewMode() {
  return truthy(envVite('VITE_IMPETUS_SAFETY_PUBLICATION_AUDIENCE_PREVIEW'));
}

export function getSafetyPublicationFlagSnapshot() {
  return {
    navigation: isSafetyNavigationRuntimeEnabled(),
    publication: isSafetyPublicationRuntimeEnabled(),
    governance_visible: isSafetyGovernanceVisibilityEnabled(),
    executive_visible: isSafetyExecutiveVisibilityEnabled(),
    operational_visible: isSafetyOperationalVisibilityEnabled(),
    audience_preview: isSafetyAudiencePreviewMode()
  };
}
