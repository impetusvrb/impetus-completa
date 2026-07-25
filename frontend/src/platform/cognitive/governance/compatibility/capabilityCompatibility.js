/**
 * CPL-003 — Compatibility Matrix (Capability → Contract → Provider → Adapter → Consumers).
 * Read-only · gerado a partir do registry CPL-001/002 + consumers declarativos.
 */
import { COGNITIVE_PLATFORM_REGISTRY } from '../../registry/cognitivePlatformRegistry.js';
import { COGNITIVE_ADAPTER_REGISTRY } from '../../registry/cognitivePlatformRegistry.js';
import { getCapabilityLifecycle } from '../lifecycle/capabilityLifecycle.js';
import { getCapabilityVersion } from '../versioning/capabilityVersions.js';

/**
 * Consumidores conhecidos por capability (UI / módulos / superfícies).
 * Declarativo — não executa nem importa os consumidores.
 */
const KNOWN_CONSUMERS = Object.freeze({
  recommendation_engine: Object.freeze([
    'CognitiveLogisticsModule',
    'WarehouseIntelligenceModule',
    'logistics_adapter',
    'quality_adapter',
    'safety_adapter',
    'environment_adapter'
  ]),
  decision_trace: Object.freeze([
    'ClDecisionTracePanel',
    'EnvironmentReasoningWorkspace',
    'CauseEffectChain'
  ]),
  scenario_simulation: Object.freeze([
    'CognitiveLogisticsModule',
    'CentroPrevisaoOperacional',
    'logistics_adapter'
  ]),
  heuristic_rules_engine: Object.freeze([
    'CognitiveLogisticsModule',
    'safeMinimalPolicy'
  ]),
  explainability: Object.freeze([
    'WidgetInsightsIA',
    'OperationalNarrative',
    'ClDecisionTracePanel'
  ]),
  risk_scoring: Object.freeze([
    'CognitiveLogisticsModule',
    'CognitiveQualityHub',
    'SafetyCognitiveHub',
    'EnvironmentCognitiveIntelligenceHub'
  ]),
  confidence_scoring: Object.freeze([
    'CognitiveLogisticsModule',
    'WidgetInsightsIA',
    'QualityDriftPanel'
  ]),
  unified_timeline: Object.freeze([
    'CognitiveLogisticsModule',
    'WarehouseIntelligenceModule',
    'CognitiveTimelineLive',
    'IndustrialTimeline'
  ]),
  predictive_insights: Object.freeze([
    'CognitiveLogisticsModule',
    'QualityPredictiveInsights',
    'EmergentInsightsPanel'
  ]),
  cognitive_observability: Object.freeze([
    'CognitiveLogisticsModule',
    'WarehouseIntelligenceModule',
    'eoxObservability'
  ]),
  gap_registry: Object.freeze([
    'CognitiveLogisticsModule',
    'WarehouseIntelligenceModule'
  ]),
  cockpit_runtime: Object.freeze([
    'multiDomainResolver',
    'specializedCockpitResolver',
    'qualityNativeCockpitRegistry',
    'ppapNativeCockpitRegistry'
  ]),
  smart_panel: Object.freeze([
    'SmartPanel',
    'DynamicClaudePanelRenderer',
    'Centro Cognitivo'
  ])
});

export function buildCompatibilityRow(cap) {
  const adapter = cap.adapterId
    ? COGNITIVE_ADAPTER_REGISTRY.find((a) => a.adapterId === cap.adapterId) || null
    : null;
  const providers = Object.freeze([
    cap.canonicalImplementation,
    ...(cap.alternateImplementations || [])
  ]);
  return Object.freeze({
    capabilityId: cap.capabilityId,
    label: cap.label,
    contractId: cap.contractId,
    provider: cap.canonicalImplementation,
    providers,
    adapterId: cap.adapterId,
    adapterStatus: cap.adapterStatus,
    adapterPhase: adapter?.cplPhase || null,
    consumers: KNOWN_CONSUMERS[cap.capabilityId] || Object.freeze([]),
    lifecycleStatus: getCapabilityLifecycle(cap.capabilityId)?.status || null,
    version: getCapabilityVersion(cap.capabilityId)?.current || null
  });
}

export const CAPABILITY_COMPATIBILITY_MATRIX = Object.freeze(
  COGNITIVE_PLATFORM_REGISTRY.map(buildCompatibilityRow)
);

export function getCompatibilityRow(capabilityId) {
  return CAPABILITY_COMPATIBILITY_MATRIX.find((r) => r.capabilityId === capabilityId) ?? null;
}

export function listConsumers(capabilityId) {
  const row = getCompatibilityRow(capabilityId);
  return row ? [...row.consumers] : [];
}

export function listProviders(capabilityId = null) {
  if (capabilityId) {
    const row = getCompatibilityRow(capabilityId);
    if (!row) return [];
    return row.providers.map((path) => ({
      capabilityId,
      path,
      role: path === row.provider ? 'canonical' : 'alternate'
    }));
  }
  return CAPABILITY_COMPATIBILITY_MATRIX.flatMap((row) =>
    row.providers.map((path) => ({
      capabilityId: row.capabilityId,
      path,
      role: path === row.provider ? 'canonical' : 'alternate'
    }))
  );
}

export function validateCompatibilityIntegrity() {
  const issues = [];
  for (const row of CAPABILITY_COMPATIBILITY_MATRIX) {
    if (!row.provider) issues.push(`${row.capabilityId}: missing provider`);
    if (!Array.isArray(row.consumers)) issues.push(`${row.capabilityId}: invalid consumers`);
  }
  return {
    valid: issues.length === 0,
    issues,
    count: CAPABILITY_COMPATIBILITY_MATRIX.length
  };
}
