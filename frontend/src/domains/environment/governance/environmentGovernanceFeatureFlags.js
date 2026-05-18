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

export function isEnvironmentGovernanceRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED'));
}

export function isEnvironmentEsgRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_ESG_RUNTIME_ENABLED'));
}

export function isEnvironmentComplianceRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_COMPLIANCE_RUNTIME_ENABLED'));
}

export function isEnvironmentCarbonRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_CARBON_RUNTIME_ENABLED'));
}

export function isEnvironmentEnergyRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_ENERGY_RUNTIME_ENABLED'));
}

export function isEnvironmentSustainabilityRuntimeEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_SUSTAINABILITY_RUNTIME_ENABLED'));
}

export function isEnvironmentExecutiveIntelligenceEnabled() {
  return truthy(envVite('VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_INTELLIGENCE_ENABLED'));
}
