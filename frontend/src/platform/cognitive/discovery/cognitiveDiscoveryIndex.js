/**
 * CPL-001 — Índice de descoberta cognitiva (referências · sem alterar código fonte).
 *
 * Gerado por varredura arquitectural CPL-001.
 * Actualizar apenas quando novas capacidades forem descobertas e registadas.
 */
export const CPL_DISCOVERY_PHASE = 'CPL-001';
export const CPL_DISCOVERY_METHOD = 'codebase_scan';
export const CPL_DISCOVERY_DATE = '2026-07-19';

/** Categorias de capacidade identificadas na plataforma IMPETUS */
export const COGNITIVE_DISCOVERY_CATEGORIES = Object.freeze([
  'recommendation',
  'decision_trace',
  'scenario_simulation',
  'risk_scoring',
  'confidence_scoring',
  'predictive_insights',
  'timeline',
  'heuristic_rules',
  'observability',
  'gap_registry',
  'cockpit_runtime',
  'cognitive_hub',
  'smart_panel',
  'forecasting',
  'executive_aioi',
  'governance'
]);

/**
 * Entradas de descoberta — cada entrada REFERENCIA implementação existente.
 * status: discovered | registered | adapter_planned
 */
export const COGNITIVE_DISCOVERY_CATALOG = Object.freeze([
  // ── Logistics OPM-007 / OPM-008 (reference stack) ──
  {
    id: 'DISC-LOG-007-WI',
    capability: 'warehouse_intelligence',
    category: 'predictive_insights',
    domain: 'logistics_wms',
    owner: 'OPM-007',
    paths: ['domains/logistics-operational/modules/warehouse-intelligence/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-LOG-008-CL',
    capability: 'cognitive_logistics',
    category: 'recommendation',
    domain: 'logistics_wms',
    owner: 'OPM-008',
    paths: ['domains/logistics-operational/modules/cognitive-logistics/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered',
    note: 'Reference cognitive stack — adapter target CPL-002'
  },

  // ── Quality ──
  {
    id: 'DISC-QTY-COG-HUB',
    capability: 'cognitive_quality_hub',
    category: 'cognitive_hub',
    domain: 'quality',
    owner: 'quality',
    paths: ['domains/quality/cognitive/CognitiveQualityHub.jsx', 'domains/quality/cognitive/qualityCognitiveRuntimeSignalAdapter.js'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-QTY-REC',
    capability: 'quality_recommendations',
    category: 'recommendation',
    domain: 'quality',
    owner: 'quality',
    paths: ['domains/quality/cognitive/QualityRecommendationPanel.jsx'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-QTY-GOV-UI',
    capability: 'quality_governance_ui_engine',
    category: 'decision_trace',
    domain: 'quality',
    owner: 'quality',
    paths: ['domains/quality/ui/qualityGovernanceUiEngine.js'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered',
    note: 'Manifesto FMEA, Ishikawa, SPC, Pareto'
  },

  // ── Safety ──
  {
    id: 'DISC-SFT-COG-HUB',
    capability: 'safety_cognitive_hub',
    category: 'cognitive_hub',
    domain: 'safety',
    owner: 'safety',
    paths: ['domains/safety/cognitive/SafetyCognitiveHub.jsx', 'domains/safety/analytics/safetyCognitivePressureAnalyzer.js'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-SFT-RUNTIME',
    capability: 'safety_cockpit_runtime',
    category: 'cockpit_runtime',
    domain: 'safety',
    owner: 'cognitiveRuntime',
    paths: ['cognitiveRuntime/domains/sst/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },

  // ── Environment ──
  {
    id: 'DISC-ENV-COG',
    capability: 'environment_cognitive_intelligence',
    category: 'cognitive_hub',
    domain: 'environment',
    owner: 'environment',
    paths: [
      'domains/environment/cognitive-runtime/EnvironmentCognitiveIntelligenceHub.jsx',
      'domains/environment/cognitive-runtime/EnvironmentReasoningWorkspace.jsx',
      'domains/environment/cognitive-runtime/EnvironmentRecommendationWorkspace.jsx'
    ],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-ENV-RUNTIME',
    capability: 'environmental_cockpit_runtime',
    category: 'cockpit_runtime',
    domain: 'environment',
    owner: 'cognitiveRuntime',
    paths: ['cognitiveRuntime/domains/environmental/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },

  // ── PPAP / Ishikawa / MSA ──
  {
    id: 'DISC-PPAP-COG',
    capability: 'cognitive_ppap',
    category: 'cognitive_hub',
    domain: 'ppap',
    owner: 'ppap',
    paths: ['domains/ppap/cockpit/CognitivePpapHub.jsx', 'cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered'
  },
  {
    id: 'DISC-ISHIKAWA',
    capability: 'ishikawa_cognitive_hubs',
    category: 'decision_trace',
    domain: 'ishikawa',
    owner: 'ishikawa',
    paths: ['domains/ishikawa/cockpit/ishikawaHubs.jsx', 'cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered'
  },
  {
    id: 'DISC-MSA',
    capability: 'cognitive_msa',
    category: 'cognitive_hub',
    domain: 'msa',
    owner: 'msa',
    paths: ['domains/msa/cockpit/CognitiveMsaHub.jsx', 'cognitiveRuntime/cockpit/msaNativeCockpitRegistry.js'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered'
  },

  // ── Logistics cockpit (distinct from OPM-008 operational) ──
  {
    id: 'DISC-LOG-COCKPIT',
    capability: 'logistics_cognitive_cockpit',
    category: 'cognitive_hub',
    domain: 'logistics',
    owner: 'logistics',
    paths: ['domains/logistics/cockpit/CognitiveLogisticsHub.jsx', 'cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered',
    note: 'Centro Comando native cockpit — distinct from OPM-008 module'
  },

  // ── Cognitive Runtime foundation ──
  {
    id: 'DISC-CR-FOUNDATION',
    capability: 'cognitive_runtime_foundation',
    category: 'cockpit_runtime',
    domain: 'platform',
    owner: 'cognitiveRuntime',
    paths: ['cognitiveRuntime/foundation/', 'cognitiveRuntime/adaptive/', 'cognitiveRuntime/learning/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-CR-MAINT',
    capability: 'maintenance_cockpit_runtime',
    category: 'cockpit_runtime',
    domain: 'maintenance',
    owner: 'cognitiveRuntime',
    paths: ['cognitiveRuntime/domains/maintenance/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-CR-PROD',
    capability: 'production_cockpit_runtime',
    category: 'cockpit_runtime',
    domain: 'production',
    owner: 'cognitiveRuntime',
    paths: ['cognitiveRuntime/domains/production/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-CR-HR',
    capability: 'hr_cockpit_runtime',
    category: 'cockpit_runtime',
    domain: 'hr',
    owner: 'cognitiveRuntime',
    paths: ['cognitiveRuntime/domains/hr/'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered'
  },
  {
    id: 'DISC-CR-EXEC',
    capability: 'executive_cockpit_runtime',
    category: 'cockpit_runtime',
    domain: 'executive',
    owner: 'cognitiveRuntime',
    paths: ['cognitiveRuntime/domains/executive/'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered'
  },

  // ── Centro Cognitivo / Command Center ──
  {
    id: 'DISC-CC-ECOSYSTEM',
    capability: 'centro_cognitivo_ecosystem',
    category: 'cognitive_hub',
    domain: 'command_center',
    owner: 'centroComando',
    paths: ['features/dashboard/centroComando/cognitiveEcosystem/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered',
    note: '50+ panels: DecisionEngine, EmergentInsights, Predictions, Organizational awareness'
  },

  // ── Smart Panel / Claude ──
  {
    id: 'DISC-SMART-PANEL',
    capability: 'smart_panel_claude',
    category: 'recommendation',
    domain: 'command_center',
    owner: 'smartPanel',
    paths: ['features/smartPanel/', 'features/dashboard/DynamicClaudePanelRenderer.jsx'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },

  // ── Forecasting ──
  {
    id: 'DISC-FORECAST',
    capability: 'centro_previsao',
    category: 'scenario_simulation',
    domain: 'forecasting',
    owner: 'forecasting',
    paths: ['pages/CentroPrevisaoOperacional.jsx', 'features/dashboard/widgets/WidgetCentroPrevisao.jsx'],
    reuse: 'yes',
    serviceCandidate: 'partial',
    status: 'discovered'
  },

  // ── Executive AIOI (foundation placeholders) ──
  {
    id: 'DISC-AIOI-RUNTIME',
    capability: 'executive_aioi_runtimes',
    category: 'executive_aioi',
    domain: 'executive',
    owner: 'aioi',
    paths: ['modules/aioi/'],
    reuse: 'partial',
    serviceCandidate: 'future',
    status: 'discovered',
    note: 'Foundation/placeholder P8.x — not operational'
  },

  // ── Transversal patterns ──
  {
    id: 'DISC-GAP-PATTERN',
    capability: 'gap_registry_pattern',
    category: 'gap_registry',
    domain: 'platform',
    owner: 'wms_modules',
    paths: ['domains/logistics-operational/modules/*/'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  },
  {
    id: 'DISC-OBS-PATTERN',
    capability: 'module_observability_pattern',
    category: 'observability',
    domain: 'platform',
    owner: 'wms_modules',
    paths: ['domains/logistics-operational/modules/*Observability.js', 'domains/logistics-operational/services/wmsUiObservability.js'],
    reuse: 'yes',
    serviceCandidate: 'yes',
    status: 'discovered'
  }
]);

export function getDiscoveryEntry(discoveryId) {
  return COGNITIVE_DISCOVERY_CATALOG.find((e) => e.id === discoveryId) ?? null;
}

export function listDiscoveryByDomain(domain) {
  return COGNITIVE_DISCOVERY_CATALOG.filter((e) => e.domain === domain);
}

export function listDiscoveryByCategory(category) {
  return COGNITIVE_DISCOVERY_CATALOG.filter((e) => e.category === category);
}
