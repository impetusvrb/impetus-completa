'use strict';

/**
 * ARC-001 — Golden manifest derivado de BASELINE-SYSTEM v1.2 (read-only).
 * Alterações aqui representam mudança arquitectural intencional — requer INC.
 */

const path = require('path');

const REPO_ROOT = path.join(__dirname, '../../..');

/** 9 runtimes homologados — IDs canónicos BASELINE-SYSTEM v1.2 */
const HOMOLOGATED_RUNTIMES = Object.freeze([
  {
    family: 'executive_native',
    runtime_id: 'executive_boardroom',
    domain: 'executive',
    payload_key: 'executive_cognitive_runtime',
    centers_key: 'executive_cognitive_centers'
  },
  {
    family: 'production_native',
    runtime_id: 'production_native',
    domain: 'production',
    payload_key: 'production_cognitive_runtime',
    centers_key: 'production_cognitive_centers'
  },
  {
    family: 'maintenance_native',
    runtime_id: 'maintenance_native',
    domain: 'maintenance',
    payload_key: 'maintenance_cognitive_runtime',
    centers_key: 'maintenance_cognitive_centers'
  },
  {
    family: 'quality_native',
    runtime_id: 'quality_native',
    domain: 'quality',
    payload_key: 'specialized_cockpit_runtime',
    centers_key: 'quality_cognitive_centers'
  },
  {
    family: 'logistics_native',
    runtime_id: 'logistics_native',
    domain: 'logistics',
    payload_key: 'logistics_cognitive_runtime',
    centers_key: 'logistics_cognitive_centers',
    signal_loader_key: 'logistics_signal_loader'
  },
  {
    family: 'ppap_native',
    runtime_id: 'ppap_native',
    domain: 'ppap',
    payload_key: 'ppap_cognitive_runtime',
    centers_key: 'ppap_cognitive_centers',
    signal_loader_key: 'ppap_signal_loader'
  },
  {
    family: 'environment_native',
    runtime_id: 'environmental_native',
    domain: 'environmental',
    payload_key: 'environmental_cognitive_runtime',
    centers_key: 'environmental_cognitive_centers'
  },
  {
    family: 'hr_native',
    runtime_id: 'hr_native',
    domain: 'hr',
    payload_key: 'hr_cognitive_runtime',
    centers_key: 'hr_cognitive_centers'
  },
  {
    family: 'sst_native',
    runtime_id: 'safety_native',
    domain: 'safety',
    payload_key: 'sst_cognitive_runtime',
    centers_key: 'safety_cognitive_centers'
  }
]);

const RUNTIME_PAYLOAD_FIELDS = Object.freeze([
  'runtime_id',
  'inactive',
  'binding_ratio',
  'promotion_applied',
  'consolidation_applied',
  'cockpit_mode'
]);

const SIGNAL_LOADER_CORE_FIELDS = Object.freeze([
  'binding_ratio',
  'bound_blocks',
  'missing_blocks',
  'pilot_blocks'
]);

const SIGNAL_LOADER_FIELDS = Object.freeze([...SIGNAL_LOADER_CORE_FIELDS, 'signal_readiness']);

const LOADER_CONTRACTS = Object.freeze([
  {
    runtime_id: 'logistics_native',
    loader: 'backend/src/cognitiveRuntime/domains/logistics/bridge/logisticsTenantSignalLoader.js',
    binding: 'backend/src/cognitiveRuntime/domains/logistics/bridge/logisticsSignalBindingRuntime.js',
    loadExport: 'loadLogisticsTenantSignals',
    runBindingExport: 'runLogisticsSignalBinding'
  },
  {
    runtime_id: 'ppap_native',
    loader: 'backend/src/cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader.js',
    binding: 'backend/src/cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime.js',
    loadExport: 'loadPpapTenantSignals',
    runBindingExport: 'runPpapSignalBinding'
  },
  {
    runtime_id: 'quality_native',
    loader: 'backend/src/cognitiveRuntime/bridge/qualityTenantSignalLoader.js',
    loadExport: 'loadQualityTenantSignals'
  }
]);

const PROMOTION_SUPERVISORS = Object.freeze([
  {
    domain: 'quality',
    path: 'backend/src/cognitiveRuntime/renderPromotion/runtime/renderPromotionSupervisor.js',
    evaluateExport: 'evaluateRenderPromotionEligibility',
    bindingBypassForceKey: 'force_render_promotion'
  },
  {
    domain: 'logistics',
    path: 'backend/src/cognitiveRuntime/renderPromotion/logistics/logisticsRenderPromotionSupervisor.js',
    evaluateExport: 'evaluateLogisticsRenderPromotionEligibility',
    bindingBypassForceKey: 'force_logistics_render',
    bindingBypassAllowed: true
  },
  {
    domain: 'ppap',
    path: 'backend/src/cognitiveRuntime/renderPromotion/ppap/ppapRenderPromotionSupervisor.js',
    evaluateExport: 'evaluatePpapRenderPromotionEligibility',
    bindingBypassForceKey: 'force_ppap_render',
    bindingBypassAllowed: false
  },
  {
    domain: 'msa',
    path: 'backend/src/cognitiveRuntime/renderPromotion/msa/msaRenderPromotionSupervisor.js',
    evaluateExport: 'evaluateMsaRenderPromotionEligibility',
    bindingBypassForceKey: 'force_msa_render',
    bindingBypassAllowed: false
  },
  {
    domain: 'ishikawa',
    path: 'backend/src/cognitiveRuntime/renderPromotion/ishikawa/ishikawaRenderPromotionSupervisor.js',
    evaluateExport: 'evaluateIshikawaRenderPromotionEligibility',
    bindingBypassForceKey: 'force_ishikawa_render',
    bindingBypassAllowed: false
  }
]);

const THRESHOLD_POLICY = Object.freeze({
  z22_min_binding: 0.5,
  z21_min_binding: 0.5,
  z23_quality: 0.35,
  z23_logistics: 0.35,
  z23_ppap: 0.35,
  z23_msa: 0.35,
  z23_ishikawa: 0.35,
  z23_production: 0.25,
  z23_hr: 0.3,
  z23_sst: 0.3
});

const SURFACE_CAPABILITIES_BASELINE = Object.freeze([
  {
    label: 'quality_primary',
    user: { dashboard_profile: 'manager_quality', functional_area: 'quality' },
    expected: { maintenance: false, commandCenter: true, quality: true }
  },
  {
    label: 'environmental_primary',
    user: { dashboard_profile: 'manager_environmental', functional_area: 'environmental' },
    expected: { maintenance: false, commandCenter: true, environmental: true }
  },
  {
    label: 'executive_primary',
    user: { dashboard_profile: 'ceo_executive', functional_area: 'executive', role: 'ceo' },
    expected: { maintenance: false, commandCenter: true, executive: true }
  },
  {
    label: 'maintenance_primary',
    user: { dashboard_profile: 'manager_maintenance', functional_area: 'maintenance' },
    expected: { maintenance: true, commandCenter: false }
  },
  {
    label: 'quality_blocks_maintenance_heuristic',
    user: { role: 'tecnic', functional_area: 'quality', dashboard_profile: 'manager_quality' },
    expected: { maintenance: false, commandCenter: true }
  }
]);

const CC_REGISTRY_BASELINE = Object.freeze({
  quality: { hubRegistry: 'QUALITY_HUB_COMPONENTS', placeholderIds: 'QUALITY_PLACEHOLDER_WIDGET_IDS', hubCountMin: 3 },
  logistics: { runtimeId: 'logistics_native', hubRegistry: 'LOGISTICS_HUB_REGISTRY', hubCount: 7 },
  ppap: { runtimeId: 'ppap_native', hubRegistry: 'PPAP_HUB_REGISTRY', hubCount: 6 },
  msa: { runtimeId: 'msa_native', hubRegistry: 'MSA_HUB_REGISTRY', hubCount: 6 },
  ishikawa: { runtimeId: 'ishikawa_native', hubRegistry: 'ISHIKAWA_HUB_REGISTRY', hubCount: 10 }
});

const BASELINE_DOCS = Object.freeze([
  {
    id: 'BASELINE-SYSTEM-v1.2',
    path: 'backend/docs/evidence/BASELINE-SYSTEM-v1.2.md',
    markers: ['SYSTEM_BASELINE_v1.2 = LOCKED', 'ppap_native']
  },
  {
    id: 'BASELINE-PPAP-v1.0',
    path: 'backend/docs/evidence/BASELINE-PPAP-v1.0.md',
    markers: ['PPAP_BASELINE_v1.0 = LOCKED']
  },
  {
    id: 'EVOLUTION-TAXONOMY-v1.0',
    path: 'backend/docs/evidence/EVOLUTION-TAXONOMY-v1.0.md',
    markers: ['EVOLUTION_TAXONOMY = LOCKED', 'INC', 'GF', 'EV']
  }
]);

const EMPTY_TENANT = '00000000-0000-4000-8000-000000000099';

/** Foundation runtimes — registered but not homologated (BASELINE-SYSTEM v1.2) */
const FOUNDATION_RUNTIMES = Object.freeze([
  {
    family: 'msa_native',
    runtime_id: 'msa_native',
    domain: 'msa',
    payload_key: 'msa_cognitive_runtime',
    centers_key: 'msa_cognitive_centers',
    signal_loader_key: 'msa_signal_loader',
    homologated: false,
    foundation_inc: 'GF-008'
  },
  {
    family: 'ishikawa_native',
    runtime_id: 'ishikawa_native',
    domain: 'ishikawa',
    payload_key: 'ishikawa_cognitive_runtime',
    centers_key: 'ishikawa_cognitive_centers',
    signal_loader_key: 'ishikawa_signal_loader',
    homologated: false,
    foundation_inc: 'GF-015'
  },
  {
    family: 'supply_native',
    runtime_id: 'supply_native',
    domain: 'supply',
    payload_key: 'supply_cognitive_runtime',
    centers_key: 'supply_cognitive_centers',
    signal_loader_key: 'supply_signal_loader',
    homologated: false,
    foundation_inc: 'GF-022'
  }
]);

const CROSS_DOMAIN_PROFILES = Object.freeze([
  { profile: 'ceo_executive', area: 'executive', payload_key: 'executive_cognitive_runtime', mode: 'executive_boardroom' },
  { profile: 'manager_production', area: 'production', payload_key: 'production_cognitive_runtime', mode: 'production_native' },
  { profile: 'manager_maintenance', area: 'maintenance', payload_key: 'maintenance_cognitive_runtime', mode: 'maintenance_native' },
  { profile: 'manager_quality', area: 'quality', payload_key: 'specialized_cockpit_runtime', mode: 'quality_native' },
  { profile: 'manager_logistics', area: 'logistics', payload_key: 'logistics_cognitive_runtime', mode: 'logistics_native' },
  { profile: 'manager_environmental', area: 'environmental', payload_key: 'environmental_cognitive_runtime', mode: 'environmental_native' },
  { profile: 'manager_hr', area: 'hr', payload_key: 'hr_cognitive_runtime', mode: 'hr_native' },
  { profile: 'manager_safety', area: 'safety', payload_key: 'sst_cognitive_runtime', mode: 'safety_native' }
]);

function absRepoPath(rel) {
  return path.join(REPO_ROOT, rel);
}

module.exports = {
  REPO_ROOT,
  HOMOLOGATED_RUNTIMES,
  RUNTIME_PAYLOAD_FIELDS,
  SIGNAL_LOADER_CORE_FIELDS,
  SIGNAL_LOADER_FIELDS,
  LOADER_CONTRACTS,
  PROMOTION_SUPERVISORS,
  THRESHOLD_POLICY,
  SURFACE_CAPABILITIES_BASELINE,
  CC_REGISTRY_BASELINE,
  BASELINE_DOCS,
  EMPTY_TENANT,
  FOUNDATION_RUNTIMES,
  CROSS_DOMAIN_PROFILES,
  absRepoPath
};
