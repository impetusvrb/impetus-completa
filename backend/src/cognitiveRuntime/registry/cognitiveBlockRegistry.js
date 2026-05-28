'use strict';

const { createBlockDefinition } = require('./cognitiveBlockSchemas');
const { buildBlockMetadata } = require('./cognitiveBlockMetadata');

function _contract(role, binding, tags = []) {
  return {
    composition_role: role,
    data_binding: binding,
    governance_tags: tags
  };
}

function _authority(minTier, domainOwner, crossDomain = false) {
  return {
    min_hierarchy_tier: minTier,
    domain_owner: domainOwner,
    cross_domain_allowed: crossDomain
  };
}

function _hierarchy(op, mgmt, strat) {
  return {
    operational_weight: op,
    management_weight: mgmt,
    strategic_weight: strat
  };
}

/** Definições oficiais — sem widgets reais; apenas contratos cognitivos */
const COGNITIVE_BLOCK_DEFINITIONS = [
  // ─── QUALITY ───
  createBlockDefinition({
    id: 'quality.nc_center',
    domain: 'quality',
    semantic_category: 'nc_center',
    label: 'Centro de Não Conformidades',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('primary_operational', 'quality.nc_events', ['domain:quality', 'governance:isolated']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.75, 0.2, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P0',
      engine_bridge: 'domains/quality/cognitive/engines',
      semantic_tags: ['nc', 'conformance', 'traceability']
    })
  }),
  createBlockDefinition({
    id: 'quality.capa_engine',
    domain: 'quality',
    semantic_category: 'capa_engine',
    label: 'Motor CAPA',
    surface: 'widget',
    semantic_layer: 'management',
    contract: _contract('governance_panel', 'quality.capa_workflow', ['domain:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.65, 0.3, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P0',
      semantic_tags: ['capa', 'root_cause', 'effectiveness']
    })
  }),
  createBlockDefinition({
    id: 'quality.spc_monitor',
    domain: 'quality',
    semantic_category: 'spc_monitor',
    label: 'Monitor SPC',
    surface: 'telemetry',
    semantic_layer: 'operational',
    contract: _contract('telemetry_cluster', 'quality.spc_metrics', ['domain:quality', 'telemetry:spc']),
    authority: _authority('supervision', 'quality'),
    hierarchy: _hierarchy(0.8, 0.15, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P0',
      engine_bridge: 'domains/quality/cognitive/spc',
      semantic_tags: ['spc', 'cpk', 'drift', 'dimensional']
    })
  }),
  createBlockDefinition({
    id: 'quality.audit_governance',
    domain: 'quality',
    semantic_category: 'audit_governance',
    label: 'Governança de Auditorias',
    surface: 'insight_panel',
    semantic_layer: 'management',
    contract: _contract('compliance_panel', 'quality.audit_trail', ['domain:quality', 'compliance:iso']),
    authority: _authority('management', 'quality'),
    hierarchy: _hierarchy(0.4, 0.45, 0.15),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['audit', 'iso', 'conformance'] })
  }),
  createBlockDefinition({
    id: 'quality.supplier_quality',
    domain: 'quality',
    semantic_category: 'supplier_quality',
    label: 'Qualidade de Fornecedores',
    surface: 'widget',
    semantic_layer: 'management',
    contract: _contract('supply_chain_panel', 'quality.supplier_score', ['domain:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.55, 0.35, 0.1),
    metadata: buildBlockMetadata({
      priority: 'P1',
      engine_bridge: 'domains/quality/cognitive/supplier',
      semantic_tags: ['supplier', 'ppm', 'lot_rejection']
    })
  }),
  createBlockDefinition({
    id: 'quality.inspection_ops',
    domain: 'quality',
    semantic_category: 'inspection_ops',
    label: 'Operações de Inspeção',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('operational_panel', 'quality.inspection_queue', ['domain:quality']),
    authority: _authority('supervision', 'quality'),
    hierarchy: _hierarchy(0.85, 0.1, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['inspection', 'approval_rate'] })
  }),
  createBlockDefinition({
    id: 'quality.contextual_ai',
    domain: 'quality',
    semantic_category: 'contextual_ai',
    label: 'IA Contextual de Qualidade',
    surface: 'insight_panel',
    semantic_layer: 'cognitive',
    contract: _contract('cognitive_narrative', 'quality.cognitive_orchestrator', [
      'domain:quality',
      'ai:contextual'
    ]),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.5, 0.35, 0.15),
    metadata: buildBlockMetadata({
      priority: 'P0',
      engine_bridge: 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator',
      semantic_tags: ['contextual_ai', 'drift', 'recurrence']
    })
  }),
  createBlockDefinition({
    id: 'quality.traceability_lane',
    domain: 'quality',
    semantic_category: 'traceability',
    label: 'Rastreabilidade de Lote',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('traceability_panel', 'quality.lot_trace', ['domain:quality']),
    authority: _authority('supervision', 'quality'),
    hierarchy: _hierarchy(0.7, 0.25, 0.05),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['traceability', 'lot'] })
  }),

  // ─── SST / SAFETY ───
  createBlockDefinition({
    id: 'sst.incident_heatmap',
    domain: 'safety',
    semantic_category: 'incident_heatmap',
    label: 'Mapa de Incidentes SST',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('primary_operational', 'safety.incident_events', ['domain:safety']),
    authority: _authority('coordination', 'safety'),
    hierarchy: _hierarchy(0.8, 0.15, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['incident', 'heatmap'] })
  }),
  createBlockDefinition({
    id: 'sst.permit_to_work',
    domain: 'safety',
    semantic_category: 'permit_to_work',
    label: 'PT / APR / LOTO',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('permit_panel', 'safety.permit_workflow', ['domain:safety', 'compliance:pt']),
    authority: _authority('supervision', 'safety'),
    hierarchy: _hierarchy(0.85, 0.1, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['pt', 'apr', 'loto'] })
  }),
  createBlockDefinition({
    id: 'sst.epi_compliance',
    domain: 'safety',
    semantic_category: 'epi_compliance',
    label: 'EPI / EPC',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('compliance_panel', 'safety.epi_status', ['domain:safety']),
    authority: _authority('supervision', 'safety'),
    hierarchy: _hierarchy(0.75, 0.2, 0.05),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['epi', 'epc'] })
  }),

  // ─── RH ───
  createBlockDefinition({
    id: 'rh.people_analytics',
    domain: 'rh',
    semantic_category: 'people_analytics',
    label: 'People Analytics',
    surface: 'widget',
    semantic_layer: 'management',
    contract: _contract('hr_panel', 'rh.workforce_metrics', ['domain:rh']),
    authority: _authority('management', 'rh'),
    hierarchy: _hierarchy(0.35, 0.5, 0.15),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['workforce', 'headcount'] })
  }),
  createBlockDefinition({
    id: 'rh.turnover_heatmap',
    domain: 'rh',
    semantic_category: 'turnover_heatmap',
    label: 'Turnover Heatmap',
    surface: 'telemetry',
    semantic_layer: 'management',
    contract: _contract('telemetry_cluster', 'rh.turnover_series', ['domain:rh']),
    authority: _authority('management', 'rh'),
    hierarchy: _hierarchy(0.3, 0.55, 0.15),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['turnover', 'retention'] })
  }),
  createBlockDefinition({
    id: 'rh.pulse_climate',
    domain: 'rh',
    semantic_category: 'pulse_climate',
    label: 'Clima Organizacional',
    surface: 'insight_panel',
    semantic_layer: 'cognitive',
    contract: _contract('cognitive_narrative', 'rh.pulse_survey', ['domain:rh']),
    authority: _authority('coordination', 'rh', true),
    hierarchy: _hierarchy(0.45, 0.4, 0.15),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['pulse', 'climate'] })
  }),

  // ─── EXECUTIVE ───
  createBlockDefinition({
    id: 'executive.boardroom',
    domain: 'executive',
    semantic_category: 'boardroom',
    label: 'Boardroom Executivo',
    surface: 'widget',
    semantic_layer: 'strategic',
    contract: _contract('strategic_overview', 'executive.board_metrics', [
      'domain:executive',
      'governance:terminal_locked_required'
    ]),
    authority: _authority('executive', 'executive'),
    hierarchy: _hierarchy(0.05, 0.15, 0.8),
    metadata: buildBlockMetadata({
      priority: 'P1',
      semantic_tags: ['boardroom', 'strategic'],
      delivery_mode: 'shadow_only'
    })
  }),
  createBlockDefinition({
    id: 'executive.enterprise_risk',
    domain: 'executive',
    semantic_category: 'enterprise_risk',
    label: 'Risco Corporativo',
    surface: 'insight_panel',
    semantic_layer: 'strategic',
    contract: _contract('risk_panel', 'executive.risk_register', ['domain:executive']),
    authority: _authority('direction', 'executive'),
    hierarchy: _hierarchy(0.1, 0.3, 0.6),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['risk', 'enterprise'] })
  }),

  // ─── PRODUCTION (registry foundation — composição futura) ───
  createBlockDefinition({
    id: 'production.line_oee',
    domain: 'production',
    semantic_category: 'line_oee',
    label: 'OEE de Linha',
    surface: 'telemetry',
    semantic_layer: 'operational',
    contract: _contract('telemetry_cluster', 'production.line_oee', ['domain:production']),
    authority: _authority('supervision', 'production'),
    hierarchy: _hierarchy(0.85, 0.1, 0.05),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['oee', 'line'] })
  }),

  // ─── MAINTENANCE ───
  createBlockDefinition({
    id: 'maintenance.work_order_center',
    domain: 'maintenance',
    semantic_category: 'work_order_center',
    label: 'Centro de Ordens de Serviço',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('primary_operational', 'maintenance.work_orders', ['domain:maintenance']),
    authority: _authority('coordination', 'maintenance'),
    hierarchy: _hierarchy(0.75, 0.2, 0.05),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['work_order', 'cmms'] })
  }),

  // ─── ENVIRONMENT ───
  createBlockDefinition({
    id: 'environment.emissions_monitor',
    domain: 'environment',
    semantic_category: 'emissions_monitor',
    label: 'Monitor de Emissões',
    surface: 'telemetry',
    semantic_layer: 'operational',
    contract: _contract('telemetry_cluster', 'environment.emissions', ['domain:environment']),
    authority: _authority('coordination', 'environment'),
    hierarchy: _hierarchy(0.7, 0.25, 0.05),
    metadata: buildBlockMetadata({ priority: 'P2', semantic_tags: ['emissions', 'esg'] })
  })
];

const { QUALITY_PILOT_BLOCKS, QUALITY_BLOCK_ALIASES } = require('./qualityCognitiveBlockPack');
const { SST_PILOT_BLOCKS, SST_BLOCK_ALIASES } = require('./sstCognitiveBlockPack');
const { HR_PILOT_BLOCKS, HR_BLOCK_ALIASES } = require('./hrCognitiveBlockPack');
const { PRODUCTION_PILOT_BLOCKS, PRODUCTION_BLOCK_ALIASES } = require('./productionCognitiveBlockPack');
const { ENVIRONMENTAL_PILOT_BLOCKS, ENVIRONMENTAL_BLOCK_ALIASES } = require('./environmentalCognitiveBlockPack');
const { MAINTENANCE_PILOT_BLOCKS, MAINTENANCE_BLOCK_ALIASES } = require('./maintenanceCognitiveBlockPack');
const { EXECUTIVE_PILOT_BLOCKS, EXECUTIVE_BLOCK_ALIASES } = require('./executiveCognitiveBlockPack');

function mergeRegistryDefinitions() {
  const byId = new Map(COGNITIVE_BLOCK_DEFINITIONS.map((b) => [b.id, b]));
  for (const b of QUALITY_PILOT_BLOCKS) byId.set(b.id, b);
  for (const b of SST_PILOT_BLOCKS) byId.set(b.id, b);
  for (const b of HR_PILOT_BLOCKS) byId.set(b.id, b);
  for (const b of PRODUCTION_PILOT_BLOCKS) byId.set(b.id, b);
  for (const b of ENVIRONMENTAL_PILOT_BLOCKS) byId.set(b.id, b);
  for (const b of MAINTENANCE_PILOT_BLOCKS) byId.set(b.id, b);
  for (const b of EXECUTIVE_PILOT_BLOCKS) byId.set(b.id, b);
  return [...byId.values()];
}

const MERGED_BLOCK_DEFINITIONS = mergeRegistryDefinitions();

const _byId = new Map(MERGED_BLOCK_DEFINITIONS.map((b) => [b.id, b]));
const _byDomain = MERGED_BLOCK_DEFINITIONS.reduce((acc, b) => {
  const d = b.domain;
  if (!acc[d]) acc[d] = [];
  acc[d].push(b);
  return acc;
}, {});

function listAllBlocks() {
  return [...MERGED_BLOCK_DEFINITIONS];
}

function getBlockById(id) {
  const canonical =
    QUALITY_BLOCK_ALIASES[id] ||
    SST_BLOCK_ALIASES[id] ||
    HR_BLOCK_ALIASES[id] ||
    PRODUCTION_BLOCK_ALIASES[id] ||
    ENVIRONMENTAL_BLOCK_ALIASES[id] ||
    MAINTENANCE_BLOCK_ALIASES[id] ||
    EXECUTIVE_BLOCK_ALIASES[id] ||
    id;
  return _byId.get(canonical) || _byId.get(id) || null;
}

function listBlocksByDomain(domain) {
  const key = String(domain || '').toLowerCase().replace(/^coordinator_/, '');
  if (key === 'sst') return _byDomain.safety || [];
  if (key === 'hr' || key === 'rh') return [...(_byDomain.hr || []), ...(_byDomain.rh || [])];
  return _byDomain[key] || [];
}

function getRegistryStats() {
  return {
    phase: 'Z.19',
    foundation_phase: 'Z.18',
    registry_role: 'metadata_catalog',
    ssot_read_facade: 'cognitiveRegistry/consolidation/unifiedCognitiveRegistry',
    total_blocks: MERGED_BLOCK_DEFINITIONS.length,
    quality_pilot_blocks: QUALITY_PILOT_BLOCKS.length,
    sst_pilot_blocks: SST_PILOT_BLOCKS.length,
    hr_pilot_blocks: HR_PILOT_BLOCKS.length,
    production_pilot_blocks: PRODUCTION_PILOT_BLOCKS.length,
    environmental_pilot_blocks: ENVIRONMENTAL_PILOT_BLOCKS.length,
    maintenance_pilot_blocks: MAINTENANCE_PILOT_BLOCKS.length,
    executive_pilot_blocks: EXECUTIVE_PILOT_BLOCKS.length,
    domains: Object.keys(_byDomain),
    definition_only: true,
    delivery_active: false,
    composition_engine: 'shadow_only'
  };
}

module.exports = {
  COGNITIVE_BLOCK_DEFINITIONS: MERGED_BLOCK_DEFINITIONS,
  MERGED_BLOCK_DEFINITIONS,
  QUALITY_BLOCK_ALIASES,
  listAllBlocks,
  getBlockById,
  listBlocksByDomain,
  getRegistryStats
};
