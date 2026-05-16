/**
 * Flags Vite — Quality Governance & Intelligence (Etapa 3). Default false.
 */
function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isQualityGovernanceRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED);
}

export function isQualitySpcRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_SPC_RUNTIME_ENABLED);
}

export function isQualityCapaIntelligenceEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_CAPA_INTELLIGENCE_ENABLED);
}

export function isQualitySupplierAnalyticsEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_SUPPLIER_ANALYTICS_ENABLED);
}

export function isQualityRiskIntelligenceEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_RISK_INTELLIGENCE_ENABLED);
}

export function isQualityExecutiveExplainabilityEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_EXECUTIVE_EXPLAINABILITY_ENABLED);
}

export function isQualityExecutiveDashboardsEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_EXECUTIVE_DASHBOARDS_ENABLED);
}

export function isQualityAiAssistanceEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_AI_ASSISTANCE_ENABLED);
}

export function getQualityGovernanceFlagSnapshot() {
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
