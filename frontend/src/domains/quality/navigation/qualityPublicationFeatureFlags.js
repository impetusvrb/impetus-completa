/**
 * Publicação do domínio QUALITY no menu/runtime — flags Vite (default off, rollback-safe).
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

export function isQualityNavigationRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_QUALITY_NAVIGATION_ENABLED'));
}

export function isQualityPublicationRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED'));
}

export function isQualityGovernanceVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_QUALITY_GOVERNANCE_VISIBILITY_ENABLED'));
}

export function isQualityExecutiveVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_QUALITY_EXECUTIVE_VISIBILITY_ENABLED'));
}

export function isQualityOperationalVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_QUALITY_OPERATIONAL_VISIBILITY_ENABLED'));
}

export function isQualityAudiencePreviewMode() {
  return truthy(envVite('VITE_IMPETUS_QUALITY_PUBLICATION_AUDIENCE_PREVIEW'));
}

export function getQualityPublicationFlagSnapshot() {
  return {
    navigation: isQualityNavigationRuntimeEnabled(),
    publication: isQualityPublicationRuntimeEnabled(),
    governance_visible: isQualityGovernanceVisibilityEnabled(),
    executive_visible: isQualityExecutiveVisibilityEnabled(),
    operational_visible: isQualityOperationalVisibilityEnabled(),
    audience_preview: isQualityAudiencePreviewMode()
  };
}
