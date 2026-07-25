/**
 * CPL-001 — Contratos corporativos cognitivos (interfaces apenas · sem implementação).
 *
 * Estes descritores definem a forma pública futura da Cognitive Platform.
 * Implementações actuais permanecem nos domínios — NÃO mover nem duplicar.
 *
 * Princípio: Discover → Standardize → Register → Adapt → Reuse
 */
export const CPL_CONTRACT_PHASE = 'CPL-001';

/** @typedef {Object} CognitiveRecommendation
 * @property {string} id
 * @property {string} priority - high | medium | low
 * @property {number} [confidence] - 0..1
 * @property {string} [impact] - high | medium | low
 * @property {string} title
 * @property {string} message
 * @property {string} action - advisory | predictive_advisory | informativo
 * @property {Object[]} [evidence]
 * @property {string[]} [modulesInvolved]
 */

/** @typedef {Object} CognitiveDecisionTrace
 * @property {Object} recommendation
 * @property {Object[]} evidence
 * @property {Object} metrics
 * @property {Object[]} events
 * @property {string[]} contracts
 * @property {string[]} [modulesInvolved]
 */

/** @typedef {Object} CognitiveScenarioResult
 * @property {string} scenarioId
 * @property {Object} baseline
 * @property {Object} projected
 * @property {Object[]} impacts
 * @property {boolean} sideEffects - must be false
 * @property {boolean} advisory
 */

export const COGNITIVE_CONTRACT_DESCRIPTORS = Object.freeze({
  RecommendationProvider: Object.freeze({
    contractId: 'RecommendationProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Fornece recomendações priorizadas, explicáveis e advisory-only',
    methods: Object.freeze(['listRecommendations', 'getRecommendation']),
    inputShape: Object.freeze({ context: 'CognitiveContext', filters: 'CognitiveFilters' }),
    outputShape: Object.freeze({ recommendations: 'CognitiveRecommendation[]' }),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clRecommendationEngine.js',
      'domains/logistics-operational/modules/warehouse-intelligence/wiRecommendationUtils.js',
      'domains/quality/cognitive/QualityRecommendationPanel.jsx',
      'domains/environment/cognitive-runtime/EnvironmentRecommendationWorkspace.jsx',
      'domains/safety/cognitive/SafetyCognitiveHub.jsx',
      'cognitiveRuntime/adaptive/adaptiveRecommendationAdapter.js',
      'cognitiveRuntime/learning/learningRecommendationAdapter.js',
      'features/dashboard/centroComando/cognitiveEcosystem/DecisionEnginePanel.jsx'
    ]),
    status: 'interface_only'
  }),

  DecisionTraceProvider: Object.freeze({
    contractId: 'DecisionTraceProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Cadeia Recommendation → Evidence → Metrics → Events → Contracts',
    methods: Object.freeze(['buildTrace', 'buildInsightTrace']),
    outputShape: Object.freeze({ trace: 'CognitiveDecisionTrace' }),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clDecisionTrace.js',
      'domains/logistics-operational/modules/cognitive-logistics/ClDecisionTracePanel.jsx',
      'domains/logistics-operational/modules/warehouse-intelligence/wiRecommendationUtils.js',
      'features/dashboard/centroComando/WidgetInsightsIA.jsx',
      'domains/environment/cognitive-runtime/EnvironmentReasoningWorkspace.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/CauseEffectChain.jsx'
    ]),
    status: 'interface_only'
  }),

  ScenarioProvider: Object.freeze({
    contractId: 'ScenarioProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Simulações what-if in-memory sem efeitos colaterais',
    methods: Object.freeze(['listScenarios', 'runScenario']),
    outputShape: Object.freeze({ result: 'CognitiveScenarioResult' }),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clScenarioUtils.js',
      'pages/CentroPrevisaoOperacional.jsx',
      'features/dashboard/widgets/PredictionCenterWidget.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/DigitalTwinPanel.jsx'
    ]),
    status: 'interface_only'
  }),

  RiskProvider: Object.freeze({
    contractId: 'RiskProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Scoring de risco operacional / ecosistémico',
    methods: Object.freeze(['computeRiskScore', 'computeHealthScore']),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clKpiUtils.js',
      'domains/logistics-operational/modules/warehouse-intelligence/wiKpiUtils.js',
      'domains/quality/cognitive/CognitiveQualityHub.jsx',
      'domains/safety/analytics/safetyCognitivePressureAnalyzer.js',
      'domains/environment/cognitive-runtime/EnvironmentCognitiveIntelligenceHub.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/EmergentInsightsPanel.jsx'
    ]),
    status: 'interface_only'
  }),

  InsightProvider: Object.freeze({
    contractId: 'InsightProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Insights preditivos, analíticos ou emergentes',
    methods: Object.freeze(['generateInsights', 'listInsights']),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clPredictiveUtils.js',
      'domains/logistics-operational/modules/warehouse-intelligence/wiBottleneckUtils.js',
      'domains/quality/cognitive/QualityPredictiveInsights.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/EmergentInsightsPanel.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/StrategicPredictions.jsx',
      'services/api.js'
    ]),
    status: 'interface_only'
  }),

  TimelineProvider: Object.freeze({
    contractId: 'TimelineProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Timelines operacionais, analíticas ou cognitivas unificadas',
    methods: Object.freeze(['buildTimeline', 'filterTimeline']),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clTimelineUtils.js',
      'domains/logistics-operational/modules/warehouse-intelligence/wiTimelineUtils.js',
      'presentation/industrial-module/IndustrialTimeline.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/CognitiveTimelineLive.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/ExecutiveTimeline.jsx',
      'pages/OperationalIntelligencePanel.jsx'
    ]),
    status: 'interface_only'
  }),

  HeuristicProvider: Object.freeze({
    contractId: 'HeuristicProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Catálogo de regras heurísticas determinísticas explicáveis',
    methods: Object.freeze(['listRules', 'getRule', 'evaluateRule']),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clHeuristicRules.js',
      'utils/dashboardSurfaceCapabilities.js',
      'policyEngine/safeMinimalPolicy.js'
    ]),
    status: 'interface_only'
  }),

  ConfidenceProvider: Object.freeze({
    contractId: 'ConfidenceProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Scoring de confiança para insights e recomendações',
    methods: Object.freeze(['scoreConfidence']),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clHeuristicRules.js',
      'domains/logistics-operational/modules/cognitive-logistics/clPredictiveUtils.js',
      'features/dashboard/centroComando/WidgetInsightsIA.jsx',
      'domains/quality/cognitive/QualityDriftPanel.jsx'
    ]),
    status: 'interface_only'
  }),

  CognitiveObservabilityProvider: Object.freeze({
    contractId: 'CognitiveObservabilityProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Eventos cognitivos/analíticos instrumentados',
    methods: Object.freeze(['track', 'listEvents']),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clObservability.js',
      'domains/logistics-operational/modules/warehouse-intelligence/wiObservability.js',
      'domains/logistics-operational/services/wmsUiObservability.js',
      'presentation/eox/eoxObservability.js',
      'governance/opm-gov-001/opmGov001ObservabilityContracts.js',
      'features/smartPanel/smartPanelEvents.js'
    ]),
    status: 'interface_only'
  }),

  GapRegistryProvider: Object.freeze({
    contractId: 'GapRegistryProvider',
    phase: CPL_CONTRACT_PHASE,
    description: 'Registo declarativo de lacunas API/UX (não insight registry)',
    methods: Object.freeze(['listGaps']),
    currentImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/clGapRegistry.js',
      'domains/logistics-operational/modules/warehouse-intelligence/wiGapRegistry.js',
      'domains/logistics-operational/modules/inventory/inventoryGapRegistry.js',
      'domains/logistics-operational/modules/receiving/receivingGapRegistry.js',
      'domains/logistics-operational/modules/picking/pickingGapRegistry.js',
      'domains/logistics-operational/modules/shipping/shippingGapRegistry.js',
      'domains/logistics-operational/modules/transfers/transferGapRegistry.js',
      'domains/logistics-operational/modules/warehouse/warehouseGapRegistry.js'
    ]),
    status: 'interface_only'
  })
});

export const COGNITIVE_CONTRACT_IDS = Object.freeze(Object.keys(COGNITIVE_CONTRACT_DESCRIPTORS));

export function getCognitiveContract(contractId) {
  return COGNITIVE_CONTRACT_DESCRIPTORS[contractId] ?? null;
}
