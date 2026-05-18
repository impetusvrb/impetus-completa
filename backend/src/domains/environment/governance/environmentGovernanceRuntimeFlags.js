'use strict';

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isEnvironmentGovernanceRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED', false);
}

function isEnvironmentEsgRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_ESG_RUNTIME_ENABLED', false);
}

function isEnvironmentComplianceRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_COMPLIANCE_RUNTIME_ENABLED', false);
}

function isEnvironmentCarbonRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_CARBON_RUNTIME_ENABLED', false);
}

function isEnvironmentEnergyRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_ENERGY_RUNTIME_ENABLED', false);
}

function isEnvironmentSustainabilityRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_SUSTAINABILITY_RUNTIME_ENABLED', false);
}

function isEnvironmentExecutiveIntelligenceEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_INTELLIGENCE_ENABLED', false);
}

function isEnvironmentAiAssistanceEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_AI_ASSISTANCE_ENABLED', false);
}

function getGovernanceRuntimeFlagSnapshot() {
  return {
    governance: isEnvironmentGovernanceRuntimeEnabled(),
    esg: isEnvironmentEsgRuntimeEnabled(),
    compliance: isEnvironmentComplianceRuntimeEnabled(),
    carbon: isEnvironmentCarbonRuntimeEnabled(),
    energy: isEnvironmentEnergyRuntimeEnabled(),
    sustainability: isEnvironmentSustainabilityRuntimeEnabled(),
    executive_intelligence: isEnvironmentExecutiveIntelligenceEnabled(),
    ai_assistance: isEnvironmentAiAssistanceEnabled(),
    auto_promotion: false
  };
}

module.exports = {
  isEnvironmentGovernanceRuntimeEnabled,
  isEnvironmentEsgRuntimeEnabled,
  isEnvironmentComplianceRuntimeEnabled,
  isEnvironmentCarbonRuntimeEnabled,
  isEnvironmentEnergyRuntimeEnabled,
  isEnvironmentSustainabilityRuntimeEnabled,
  isEnvironmentExecutiveIntelligenceEnabled,
  isEnvironmentAiAssistanceEnabled,
  getGovernanceRuntimeFlagSnapshot
};
