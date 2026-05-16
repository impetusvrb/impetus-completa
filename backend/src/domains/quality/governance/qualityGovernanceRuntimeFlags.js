'use strict';

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isQualityGovernanceRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED', false);
}

function isQualitySpcRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_SPC_RUNTIME_ENABLED', false);
}

function isQualityCapaIntelligenceEnabled() {
  return envBool('IMPETUS_QUALITY_CAPA_INTELLIGENCE_ENABLED', false);
}

function isQualitySupplierAnalyticsEnabled() {
  return envBool('IMPETUS_QUALITY_SUPPLIER_ANALYTICS_ENABLED', false);
}

function isQualityRiskIntelligenceEnabled() {
  return envBool('IMPETUS_QUALITY_RISK_INTELLIGENCE_ENABLED', false);
}

function isQualityExecutiveExplainabilityEnabled() {
  return envBool('IMPETUS_QUALITY_EXECUTIVE_EXPLAINABILITY_ENABLED', false);
}

function isQualityExecutiveDashboardsEnabled() {
  return envBool('IMPETUS_QUALITY_EXECUTIVE_DASHBOARDS_ENABLED', false);
}

function isQualityAiAssistanceEnabled() {
  return envBool('IMPETUS_QUALITY_AI_ASSISTANCE_ENABLED', false);
}

function getGovernanceRuntimeFlagSnapshot() {
  return {
    governance: isQualityGovernanceRuntimeEnabled(),
    spc: isQualitySpcRuntimeEnabled(),
    capa: isQualityCapaIntelligenceEnabled(),
    supplier: isQualitySupplierAnalyticsEnabled(),
    risk: isQualityRiskIntelligenceEnabled(),
    executive_explainability: isQualityExecutiveExplainabilityEnabled(),
    executive_dashboards: isQualityExecutiveDashboardsEnabled(),
    ai_assistance: isQualityAiAssistanceEnabled()
  };
}

module.exports = {
  isQualityGovernanceRuntimeEnabled,
  isQualitySpcRuntimeEnabled,
  isQualityCapaIntelligenceEnabled,
  isQualitySupplierAnalyticsEnabled,
  isQualityRiskIntelligenceEnabled,
  isQualityExecutiveExplainabilityEnabled,
  isQualityExecutiveDashboardsEnabled,
  isQualityAiAssistanceEnabled,
  getGovernanceRuntimeFlagSnapshot
};
