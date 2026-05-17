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

export function isLogisticsNavigationRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED'));
}

export function isLogisticsPublicationRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED'));
}

export function isLogisticsGovernanceVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_GOVERNANCE_RUNTIME_ENABLED'));
}

export function isLogisticsExecutiveVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED'));
}

export function isLogisticsOperationalVisibilityEnabled() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED'));
}

export function isLogisticsAudiencePreviewMode() {
  return truthy(envVite('VITE_IMPETUS_LOGISTICS_PUBLICATION_AUDIENCE_PREVIEW'));
}

export function getLogisticsPublicationFlagSnapshot() {
  return {
    navigation: isLogisticsNavigationRuntimeEnabled(),
    publication: isLogisticsPublicationRuntimeEnabled(),
    governance_visible: isLogisticsGovernanceVisibilityEnabled(),
    executive_visible: isLogisticsExecutiveVisibilityEnabled(),
    operational_visible: isLogisticsOperationalVisibilityEnabled(),
    audience_preview: isLogisticsAudiencePreviewMode()
  };
}
