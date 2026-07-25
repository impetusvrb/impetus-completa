/**
 * CPL-001 — Registry corporativo da Cognitive Platform.
 *
 * APENAS REFERENCIA implementações existentes.
 * NÃO implementa motores, heurísticas, timelines ou observabilidade.
 *
 * Próximas fases: CPL-002 (Shared Adapters), CPL-003 (Enterprise Registry).
 */
import { COGNITIVE_CONTRACT_DESCRIPTORS } from '../contracts/cognitiveContractDescriptors.js';
import { COGNITIVE_DISCOVERY_CATALOG } from '../discovery/cognitiveDiscoveryIndex.js';

export const CPL_REGISTRY_PHASE = 'CPL-002';
export const CPL_REGISTRY_VERSION = '2.0.0';

/**
 * Capacidades corporativas → provider → implementação actual → domínio proprietário.
 * adapterStatus: not_started | planned | active
 */
export const COGNITIVE_PLATFORM_REGISTRY = Object.freeze([
  {
    capabilityId: 'recommendation_engine',
    label: 'Recommendation Engine',
    contractId: 'RecommendationProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clRecommendationEngine.js',
    alternateImplementations: Object.freeze([
      'domains/logistics-operational/modules/warehouse-intelligence/wiRecommendationUtils.js',
      'domains/quality/cognitive/QualityRecommendationPanel.jsx',
      'domains/environment/cognitive-runtime/EnvironmentRecommendationWorkspace.jsx',
      'domains/safety/cognitive/SafetyCognitiveHub.jsx',
      'cognitiveRuntime/adaptive/adaptiveRecommendationAdapter.js',
      'cognitiveRuntime/learning/learningRecommendationAdapter.js'
    ]),
    adapterId: 'logistics_adapter',
    adapterStatus: 'active',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'decision_trace',
    label: 'Decision Trace',
    contractId: 'DecisionTraceProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clDecisionTrace.js',
    alternateImplementations: Object.freeze([
      'domains/environment/cognitive-runtime/EnvironmentReasoningWorkspace.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/CauseEffectChain.jsx'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'scenario_simulation',
    label: 'Scenario Simulation',
    contractId: 'ScenarioProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clScenarioUtils.js',
    alternateImplementations: Object.freeze([
      'pages/CentroPrevisaoOperacional.jsx',
      'features/dashboard/widgets/PredictionCenterWidget.jsx'
    ]),
    adapterId: 'logistics_adapter',
    adapterStatus: 'active',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'heuristic_rules_engine',
    label: 'Heuristic Rules Engine',
    contractId: 'HeuristicProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clHeuristicRules.js',
    alternateImplementations: Object.freeze([
      'utils/dashboardSurfaceCapabilities.js',
      'policyEngine/safeMinimalPolicy.js'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'explainability',
    label: 'Explainability Engine',
    contractId: 'DecisionTraceProvider',
    ownerDomain: 'command_center',
    canonicalImplementation: 'features/dashboard/centroComando/WidgetInsightsIA.jsx',
    alternateImplementations: Object.freeze([
      'domains/logistics-operational/modules/cognitive-logistics/ClDecisionTracePanel.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/OperationalNarrative.jsx'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'risk_scoring',
    label: 'Risk Scoring',
    contractId: 'RiskProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clKpiUtils.js',
    alternateImplementations: Object.freeze([
      'domains/quality/cognitive/CognitiveQualityHub.jsx',
      'domains/safety/analytics/safetyCognitivePressureAnalyzer.js',
      'domains/environment/cognitive-runtime/EnvironmentCognitiveIntelligenceHub.jsx'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'confidence_scoring',
    label: 'Confidence Scoring',
    contractId: 'ConfidenceProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clPredictiveUtils.js',
    alternateImplementations: Object.freeze([
      'features/dashboard/centroComando/WidgetInsightsIA.jsx',
      'domains/quality/cognitive/QualityDriftPanel.jsx'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'unified_timeline',
    label: 'Unified Timeline',
    contractId: 'TimelineProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clTimelineUtils.js',
    alternateImplementations: Object.freeze([
      'domains/logistics-operational/modules/warehouse-intelligence/wiTimelineUtils.js',
      'features/dashboard/centroComando/cognitiveEcosystem/CognitiveTimelineLive.jsx',
      'presentation/industrial-module/IndustrialTimeline.jsx'
    ]),
    adapterId: 'logistics_adapter',
    adapterStatus: 'active',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'predictive_insights',
    label: 'Predictive Insights',
    contractId: 'InsightProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clPredictiveUtils.js',
    alternateImplementations: Object.freeze([
      'domains/logistics-operational/modules/warehouse-intelligence/wiBottleneckUtils.js',
      'domains/quality/cognitive/QualityPredictiveInsights.jsx',
      'features/dashboard/centroComando/cognitiveEcosystem/EmergentInsightsPanel.jsx'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'cognitive_observability',
    label: 'Cognitive Observability',
    contractId: 'CognitiveObservabilityProvider',
    ownerDomain: 'logistics_wms',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clObservability.js',
    alternateImplementations: Object.freeze([
      'domains/logistics-operational/modules/warehouse-intelligence/wiObservability.js',
      'domains/logistics-operational/services/wmsUiObservability.js',
      'presentation/eox/eoxObservability.js'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'gap_registry',
    label: 'Gap Registry (not Insight Registry)',
    contractId: 'GapRegistryProvider',
    ownerDomain: 'platform',
    canonicalImplementation: 'domains/logistics-operational/modules/cognitive-logistics/clGapRegistry.js',
    alternateImplementations: Object.freeze([
      'domains/logistics-operational/modules/warehouse-intelligence/wiGapRegistry.js'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false,
    note: 'Pattern replicado em 8 módulos WMS — Insight Registry centralizado inexistente'
  },
  {
    capabilityId: 'cockpit_runtime',
    label: 'Cognitive Cockpit Runtime',
    contractId: null,
    ownerDomain: 'platform',
    canonicalImplementation: 'cognitiveRuntime/foundation/multiDomainResolver.js',
    alternateImplementations: Object.freeze([
      'cognitiveRuntime/cockpit/specializedCockpitResolver.js',
      'cognitiveRuntime/adaptive/adaptiveOrchestrationRuntime.js'
    ]),
    adapterId: null,
    adapterStatus: 'not_started',
    reuse: 'required',
    migrateInCpl001: false
  },
  {
    capabilityId: 'smart_panel',
    label: 'Smart Panel / Claude Renderer',
    contractId: 'InsightProvider',
    ownerDomain: 'command_center',
    canonicalImplementation: 'features/smartPanel/SmartPanel.jsx',
    alternateImplementations: Object.freeze([
      'features/dashboard/DynamicClaudePanelRenderer.jsx',
      'features/smartPanel/panelCommandProcessor.js'
    ]),
    adapterId: 'command_center_adapter',
    adapterStatus: 'planned',
    reuse: 'required',
    migrateInCpl001: false
  }
]);

/** Adapters — CPL-002 activos (logistics, quality, safety, environment) */
export const COGNITIVE_ADAPTER_REGISTRY = Object.freeze([
  {
    adapterId: 'logistics_adapter',
    label: 'Logistics Cognitive Adapter',
    targetDomain: 'logistics_wms',
    bridges: Object.freeze(['OPM-007', 'OPM-008', 'cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js']),
    runtimePath: 'platform/cognitive/adapters/logistics/logisticsCognitiveAdapter.js',
    status: 'active',
    version: '1.0.0',
    health: 'available',
    cplPhase: 'CPL-002'
  },
  {
    adapterId: 'quality_adapter',
    label: 'Quality Cognitive Adapter',
    targetDomain: 'quality',
    bridges: Object.freeze(['domains/quality/cognitive/', 'cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js']),
    runtimePath: 'platform/cognitive/adapters/quality/qualityCognitiveAdapter.js',
    status: 'active',
    version: '1.0.0',
    health: 'available',
    cplPhase: 'CPL-002'
  },
  {
    adapterId: 'safety_adapter',
    label: 'Safety Cognitive Adapter',
    targetDomain: 'safety',
    bridges: Object.freeze(['domains/safety/cognitive/', 'cognitiveRuntime/domains/sst/']),
    runtimePath: 'platform/cognitive/adapters/safety/safetyCognitiveAdapter.js',
    status: 'active',
    version: '1.0.0',
    health: 'available',
    cplPhase: 'CPL-002'
  },
  {
    adapterId: 'environment_adapter',
    label: 'Environment Cognitive Adapter',
    targetDomain: 'environment',
    bridges: Object.freeze(['domains/environment/cognitive-runtime/', 'cognitiveRuntime/domains/environmental/']),
    runtimePath: 'platform/cognitive/adapters/environment/environmentCognitiveAdapter.js',
    status: 'active',
    version: '1.0.0',
    health: 'available',
    cplPhase: 'CPL-002'
  },
  {
    adapterId: 'maintenance_adapter',
    label: 'Maintenance Cognitive Adapter',
    targetDomain: 'maintenance',
    bridges: Object.freeze(['cognitiveRuntime/domains/maintenance/']),
    status: 'planned',
    cplPhase: 'CPL-002'
  },
  {
    adapterId: 'production_adapter',
    label: 'Production Cognitive Adapter',
    targetDomain: 'production',
    bridges: Object.freeze(['cognitiveRuntime/domains/production/']),
    status: 'planned',
    cplPhase: 'CPL-002'
  },
  {
    adapterId: 'ppap_adapter',
    label: 'PPAP Cognitive Adapter',
    targetDomain: 'ppap',
    bridges: Object.freeze(['domains/ppap/cockpit/', 'cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js']),
    status: 'planned',
    cplPhase: 'CPL-003'
  },
  {
    adapterId: 'ishikawa_adapter',
    label: 'Ishikawa Cognitive Adapter',
    targetDomain: 'ishikawa',
    bridges: Object.freeze(['domains/ishikawa/cockpit/', 'cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js']),
    status: 'planned',
    cplPhase: 'CPL-003'
  },
  {
    adapterId: 'command_center_adapter',
    label: 'Command Center Cognitive Adapter',
    targetDomain: 'command_center',
    bridges: Object.freeze(['features/dashboard/centroComando/cognitiveEcosystem/', 'features/smartPanel/']),
    status: 'planned',
    cplPhase: 'CPL-003'
  }
]);

/** WMS Enterprise Baseline — congelado pós OPM-008 */
export const WMS_ENTERPRISE_BASELINE = Object.freeze({
  status: 'complete',
  phases: Object.freeze(['OPM-001D', 'OPM-002A', 'OPM-003', 'OPM-004', 'OPM-005', 'OPM-006', 'OPM-007', 'OPM-008', 'OPM-E2E-001', 'OPM-GOV-001', 'WMS-REF-001']),
  frozen: true,
  note: 'Domínio WMS estabilizado — evolução seguinte na plataforma CPL'
});

export function getCognitiveCapability(capabilityId) {
  return COGNITIVE_PLATFORM_REGISTRY.find((c) => c.capabilityId === capabilityId) ?? null;
}

export function getCognitiveAdapterRegistryEntry(adapterId) {
  return COGNITIVE_ADAPTER_REGISTRY.find((a) => a.adapterId === adapterId) ?? null;
}

export function listCapabilitiesByDomain(ownerDomain) {
  return COGNITIVE_PLATFORM_REGISTRY.filter((c) => c.ownerDomain === ownerDomain);
}

/** Validação CPL-001: registry referencia contratos e descoberta */
export function validateCpl001RegistryIntegrity() {
  const contractIds = new Set(Object.keys(COGNITIVE_CONTRACT_DESCRIPTORS));
  const discoveryIds = new Set(COGNITIVE_DISCOVERY_CATALOG.map((d) => d.id));
  const issues = [];

  for (const cap of COGNITIVE_PLATFORM_REGISTRY) {
    if (cap.contractId && !contractIds.has(cap.contractId)) {
      issues.push(`capability ${cap.capabilityId}: contract ${cap.contractId} missing`);
    }
    if (cap.adapterId) {
      const adapter = getCognitiveAdapterRegistryEntry(cap.adapterId);
      if (!adapter) issues.push(`capability ${cap.capabilityId}: adapter ${cap.adapterId} missing`);
    }
    if (cap.migrateInCpl001) {
      issues.push(`capability ${cap.capabilityId}: migration forbidden in CPL-001`);
    }
  }

  return { valid: issues.length === 0, issues, discoveryCount: discoveryIds.size };
}

/** Validação CPL-002: adapters activos registados sem migração */
export function validateCpl002RegistryIntegrity() {
  const cpl001 = validateCpl001RegistryIntegrity();
  const issues = [...cpl001.issues];
  const activeAdapters = COGNITIVE_ADAPTER_REGISTRY.filter((a) => a.status === 'active');

  for (const a of activeAdapters) {
    if (!a.runtimePath) issues.push(`adapter ${a.adapterId}: missing runtimePath`);
    if (!a.version) issues.push(`adapter ${a.adapterId}: missing version`);
  }

  const activeCaps = COGNITIVE_PLATFORM_REGISTRY.filter((c) => c.adapterStatus === 'active');
  if (activeCaps.length < 3) issues.push('expected at least 3 active adapter-linked capabilities');

  return { valid: issues.length === 0, issues, activeAdapters: activeAdapters.length };
}

export {
  COGNITIVE_CONTRACT_DESCRIPTORS,
  COGNITIVE_DISCOVERY_CATALOG
};
