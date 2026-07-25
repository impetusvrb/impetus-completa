/**
 * FIN-AUD-001 — Cognitive Capabilities Audit (read-only).
 */
export const FIN_COGNITIVE_CAPABILITIES = Object.freeze([
  Object.freeze({
    id: 'cashflow_prediction',
    label: 'Previsão fluxo de caixa',
    status: 'not_found',
    maturity: 'gap',
    note: 'Pipeline cashflow declarado em domainRegistry — sem implementação'
  }),
  Object.freeze({
    id: 'financial_risk_analysis',
    label: 'Análise risco financeiro',
    status: 'partial',
    maturity: 'partial',
    locations: [
      'backend/src/cognitiveRuntime/economics/operationalEconomicImpactEngine.js',
      'backend/src/cognitiveRuntime/economics/economicPressureIndexEngine.js',
      'backend/src/services/financialLeakageDetectorService.js'
    ],
    note: 'Risco operacional/económico — não risco creditício ERP'
  }),
  Object.freeze({
    id: 'financial_recommendations',
    label: 'Recomendações financeiras',
    status: 'partial',
    maturity: 'partial',
    locations: [
      'backend/src/services/smartPanelCommandService.js (dataset financeiro)',
      'backend/src/services/operationalForecastingService.js'
    ],
    note: 'Advisory operacional — sem Recommendation Engine financeiro dedicado'
  }),
  Object.freeze({
    id: 'deviation_detection',
    label: 'Detecção desvios financeiros',
    status: 'partial',
    maturity: 'partial',
    locations: ['backend/src/services/financialLeakageDetectorService.js'],
    note: 'Vazamentos operacionais — API routes gap'
  }),
  Object.freeze({
    id: 'budget_intelligence',
    label: 'Orçamento / budget',
    status: 'experimental',
    maturity: 'partial',
    locations: [
      'backend/src/domains/supply/model/valueObjects.js (BudgetReference)',
      'backend/src/domainAuthority/registry/domainRegistry.js (pipeline budget)'
    ],
    crossDomain: true
  }),
  Object.freeze({
    id: 'cost_indicators',
    label: 'Indicadores de custo',
    status: 'active',
    maturity: 'complete',
    locations: [
      'backend/src/services/industrialCostService.js',
      'backend/src/services/aioi/aioiBottleneckCostService.js',
      'frontend/src/features/dashboard/centroComando/WidgetGraficoCustosSetor.jsx'
    ]
  }),
  Object.freeze({
    id: 'executive_financial_health',
    label: 'Saúde financeira executiva',
    status: 'partial',
    maturity: 'partial',
    locations: ['backend/src/cognitiveRuntime/registry/executiveCognitiveBlockPack.js'],
    note: 'Bloco executive.financial_health — binding executive.financial'
  }),
  Object.freeze({
    id: 'cpl_finance_adapter',
    label: 'CPL Finance Adapter',
    status: 'not_found',
    maturity: 'gap',
    note: 'CPL-002 adapters: logistics, quality, safety, environment — sem finance_adapter'
  })
]);

export function listCognitiveByStatus(status) {
  return FIN_COGNITIVE_CAPABILITIES.filter((c) => c.status === status);
}

export function validateCognitiveAudit() {
  const gaps = FIN_COGNITIVE_CAPABILITIES.filter((c) => c.status === 'not_found' || c.maturity === 'gap');
  return {
    valid: FIN_COGNITIVE_CAPABILITIES.length >= 6,
    gaps: gaps.map((g) => g.id),
    count: FIN_COGNITIVE_CAPABILITIES.length
  };
}
