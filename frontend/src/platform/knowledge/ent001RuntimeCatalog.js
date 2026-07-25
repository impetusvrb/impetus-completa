/**
 * ENT-001 — Catálogo de runtimes (FIN-AUD + OPM/WMS + cognitiveRuntime).
 */
import { FIN_RUNTIME_MAP } from '../audit/finance/finAud001RuntimeMap.js';
import {
  WMS_ENTERPRISE_BASELINE,
  COGNITIVE_ADAPTER_REGISTRY
} from '../cognitive/registry/cognitivePlatformRegistry.js';
import { ENT_001_PHASE } from './ent001Constants.js';

const OPM_OPERATIONAL_RUNTIMES = Object.freeze([
  Object.freeze({
    runtimeId: 'wms_enterprise_baseline',
    label: 'WMS Enterprise Baseline',
    type: 'operational',
    maturity: 'certified',
    status: WMS_ENTERPRISE_BASELINE.status,
    frozen: WMS_ENTERPRISE_BASELINE.frozen,
    phases: WMS_ENTERPRISE_BASELINE.phases,
    ownerDomain: 'logistics_wms',
    source: 'cognitivePlatformRegistry.js → WMS_ENTERPRISE_BASELINE'
  }),
  Object.freeze({
    runtimeId: 'opm_gov_lifecycle',
    label: 'OPM Governance Lifecycle',
    type: 'operational_governance',
    maturity: 'certified',
    status: 'active',
    ownerDomain: 'logistics_wms',
    source: 'frontend/docs/evidence/OPM-GOV-001-*'
  }),
  Object.freeze({
    runtimeId: 'operational_brain_engine',
    label: 'Operational Brain Engine',
    type: 'dashboard_runtime',
    maturity: 'mature',
    status: 'active',
    ownerDomain: 'command_center',
    location: 'backend/src/services/operationalBrainEngine.js',
    source: 'REG-002 R5'
  }),
  Object.freeze({
    runtimeId: 'industrial_operational_map',
    label: 'Industrial Operational Map',
    type: 'dashboard_runtime',
    maturity: 'mature',
    status: 'active',
    ownerDomain: 'command_center',
    location: 'backend/src/services/industrialOperationalMapService.js',
    source: 'REG-002 R2'
  }),
  Object.freeze({
    runtimeId: 'financial_leakage_detector',
    label: 'Financial Leakage Detector',
    type: 'dashboard_runtime',
    maturity: 'mature',
    status: 'active',
    ownerDomain: 'finance',
    location: 'backend/src/services/financialLeakageDetectorService.js',
    source: 'REG-002 R1 — remontado'
  }),
  Object.freeze({
    runtimeId: 'operational_forecasting',
    label: 'Operational Forecasting',
    type: 'dashboard_runtime',
    maturity: 'partial',
    status: 'partial_mount',
    ownerDomain: 'command_center',
    location: 'backend/src/services/operationalForecastingService.js',
    source: 'REG-001 centro_previsao_forecasting_gap'
  })
]);

const COGNITIVE_RUNTIME_ENTRIES = Object.freeze([
  Object.freeze({
    runtimeId: 'cognitive_runtime_orchestrator',
    label: 'cognitiveRuntime Orchestrator',
    type: 'cognitive',
    maturity: 'mature',
    status: 'active',
    ownerDomain: 'cognitive_center',
    location: 'backend/src/cognitiveRuntime/',
    source: 'CPL-001 discovery'
  }),
  Object.freeze({
    runtimeId: 'specialized_cockpit_resolver',
    label: 'Specialized Cockpit Resolver',
    type: 'cognitive',
    maturity: 'mature',
    status: 'active',
    ownerDomain: 'cognitive_center',
    location: 'frontend/src/cognitiveRuntime/cockpit/specializedCockpitResolver.js',
    source: 'CPL discovery + PPAP/MSA/Ishikawa cockpits'
  }),
  Object.freeze({
    runtimeId: 'adaptive_orchestration',
    label: 'Adaptive Orchestration Runtime',
    type: 'cognitive',
    maturity: 'partial',
    status: 'active',
    ownerDomain: 'cognitive_center',
    location: 'frontend/src/cognitiveRuntime/adaptive/adaptiveOrchestrationRuntime.js',
    source: 'CPL-001'
  })
]);

function _mapFinRuntime(r) {
  return Object.freeze({
    runtimeId: r.runtimeId,
    label: r.label,
    type: r.type,
    maturity: r.maturity,
    status: r.status,
    location: r.location,
    ownerDomain: (r.relatedDomains && r.relatedDomains[0]) || 'finance',
    featureFlags: r.featureFlags ? Object.freeze([...r.featureFlags]) : [],
    source: 'FIN-AUD-001 finAud001RuntimeMap.js'
  });
}

function _mapAdapter(a) {
  return Object.freeze({
    runtimeId: a.adapterId,
    label: a.label,
    type: 'cognitive_adapter',
    maturity: a.status === 'active' ? 'mature' : 'planned',
    status: a.status,
    ownerDomain: a.targetDomain,
    location: a.runtimePath,
    bridges: Object.freeze([...(a.bridges || [])]),
    source: 'CPL-002 COGNITIVE_ADAPTER_REGISTRY'
  });
}

export function buildRuntimeCatalog() {
  const finIds = new Set(FIN_RUNTIME_MAP.map((r) => r.runtimeId));
  const entries = [
    ...FIN_RUNTIME_MAP.map(_mapFinRuntime),
    ...OPM_OPERATIONAL_RUNTIMES.filter((r) => !finIds.has(r.runtimeId)),
    ...COGNITIVE_RUNTIME_ENTRIES,
    ...COGNITIVE_ADAPTER_REGISTRY.map(_mapAdapter)
  ];
  return Object.freeze(entries);
}

export const ENT_RUNTIME_CATALOG = buildRuntimeCatalog();

export function getRuntimeEntry(runtimeId) {
  return ENT_RUNTIME_CATALOG.find((r) => r.runtimeId === runtimeId) ?? null;
}

export function listRuntimesByDomain(domain) {
  return ENT_RUNTIME_CATALOG.filter((r) => r.ownerDomain === domain);
}

export function validateRuntimeCatalog() {
  const issues = [];
  if (ENT_RUNTIME_CATALOG.length < 15) {
    issues.push(`expected >= 15 runtime entries, got ${ENT_RUNTIME_CATALOG.length}`);
  }
  if (!getRuntimeEntry('wms_enterprise_baseline')) {
    issues.push('missing WMS enterprise baseline');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    count: ENT_RUNTIME_CATALOG.length
  };
}
