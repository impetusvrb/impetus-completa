'use strict';

/**
 * Pacote oficial Z.19 — Quality Cognitive Cockpit Pilot blocks.
 * Definições apenas; sem widgets frontend.
 */
const { createBlockDefinition } = require('./cognitiveBlockSchemas');
const { buildBlockMetadata } = require('./cognitiveBlockMetadata');

function _contract(role, binding, tags = []) {
  return { composition_role: role, data_binding: binding, governance_tags: tags };
}
function _authority(minTier, domainOwner, crossDomain = false) {
  return { min_hierarchy_tier: minTier, domain_owner: domainOwner, cross_domain_allowed: crossDomain };
}
function _hierarchy(op, mgmt, strat) {
  return { operational_weight: op, management_weight: mgmt, strategic_weight: strat };
}

const QUALITY_PILOT_BLOCK_IDS = Object.freeze([
  'quality.nc_center',
  'quality.capa_engine',
  'quality.spc_monitor',
  'quality.audit_governance',
  'quality.supplier_intelligence',
  'quality.contextual_quality_ai',
  'quality.quality_narrative',
  'quality.process_stability',
  'quality.nonconformity_heatmap',
  'quality.recurrence_analysis'
]);

/** Aliases Z.18 → Z.19 canonical ids */
const QUALITY_BLOCK_ALIASES = Object.freeze({
  'quality.supplier_quality': 'quality.supplier_intelligence',
  'quality.contextual_ai': 'quality.contextual_quality_ai',
  'quality.inspection_ops': 'quality.nc_center'
});

const QUALITY_PILOT_BLOCKS = [
  createBlockDefinition({
    id: 'quality.nc_center',
    domain: 'quality',
    semantic_category: 'nc_center',
    label: 'Centro de Não Conformidades',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('primary_operational', 'quality.nc_events', ['domain:quality', 'pilot:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.78, 0.17, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P0',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/telemetry/qualityCognitiveSignalAggregator',
      semantic_tags: ['nc', 'ncr', 'conformance']
    })
  }),
  createBlockDefinition({
    id: 'quality.capa_engine',
    domain: 'quality',
    semantic_category: 'capa_engine',
    label: 'Motor CAPA',
    surface: 'widget',
    semantic_layer: 'management',
    contract: _contract('governance_panel', 'quality.capa_workflow', ['domain:quality', 'pilot:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.62, 0.33, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P0',
      pilot_pack: 'quality_cognitive_v1',
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
    hierarchy: _hierarchy(0.82, 0.13, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P0',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/drift/qualityDriftPredictionEngine',
      semantic_tags: ['spc', 'cpk', 'cp', 'drift']
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
    hierarchy: _hierarchy(0.38, 0.47, 0.15),
    metadata: buildBlockMetadata({
      priority: 'P1',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/audit/qualityCognitiveAuditEnvelope',
      semantic_tags: ['audit', 'iso', 'governance']
    })
  }),
  createBlockDefinition({
    id: 'quality.supplier_intelligence',
    domain: 'quality',
    semantic_category: 'supplier_intelligence',
    label: 'Inteligência de Fornecedores',
    surface: 'widget',
    semantic_layer: 'management',
    contract: _contract('supply_chain_panel', 'quality.supplier_score', ['domain:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.52, 0.38, 0.1),
    metadata: buildBlockMetadata({
      priority: 'P1',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/supplier/qualitySupplierScoringEngine',
      semantic_tags: ['supplier', 'ppm', 'score']
    })
  }),
  createBlockDefinition({
    id: 'quality.contextual_quality_ai',
    domain: 'quality',
    semantic_category: 'contextual_quality_ai',
    label: 'IA Contextual de Qualidade',
    surface: 'insight_panel',
    semantic_layer: 'cognitive',
    contract: _contract('cognitive_narrative', 'quality.cognitive_orchestrator', [
      'domain:quality',
      'ai:contextual'
    ]),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.48, 0.37, 0.15),
    metadata: buildBlockMetadata({
      priority: 'P0',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator',
      semantic_tags: ['contextual_ai', 'recommendations']
    })
  }),
  createBlockDefinition({
    id: 'quality.quality_narrative',
    domain: 'quality',
    semantic_category: 'quality_narrative',
    label: 'Narrativa Executiva de Qualidade',
    surface: 'narrative',
    semantic_layer: 'narrative',
    contract: _contract('domain_narrative', 'quality.executive_narrative', ['domain:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.35, 0.45, 0.2),
    metadata: buildBlockMetadata({
      priority: 'P1',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/narratives/qualityExecutiveNarrativeEngine',
      semantic_tags: ['narrative', 'headline', 'quality_story']
    })
  }),
  createBlockDefinition({
    id: 'quality.process_stability',
    domain: 'quality',
    semantic_category: 'process_stability',
    label: 'Estabilidade de Processo',
    surface: 'telemetry',
    semantic_layer: 'operational',
    contract: _contract('stability_panel', 'quality.process_stability', ['domain:quality']),
    authority: _authority('supervision', 'quality'),
    hierarchy: _hierarchy(0.76, 0.19, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P1',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/deterioration/qualityProcessDeteriorationEngine',
      semantic_tags: ['stability', 'deterioration', 'capability']
    })
  }),
  createBlockDefinition({
    id: 'quality.nonconformity_heatmap',
    domain: 'quality',
    semantic_category: 'nonconformity_heatmap',
    label: 'Heatmap de Não Conformidades',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _contract('heatmap_panel', 'quality.nc_heatmap', ['domain:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.8, 0.15, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P0',
      pilot_pack: 'quality_cognitive_v1',
      semantic_tags: ['nc', 'heatmap', 'sector']
    })
  }),
  createBlockDefinition({
    id: 'quality.recurrence_analysis',
    domain: 'quality',
    semantic_category: 'recurrence_analysis',
    label: 'Análise de Reincidência',
    surface: 'insight_panel',
    semantic_layer: 'cognitive',
    contract: _contract('recurrence_panel', 'quality.recurrence', ['domain:quality']),
    authority: _authority('coordination', 'quality'),
    hierarchy: _hierarchy(0.7, 0.25, 0.05),
    metadata: buildBlockMetadata({
      priority: 'P1',
      pilot_pack: 'quality_cognitive_v1',
      engine_bridge: 'domains/quality/cognitive/recurrence/qualityRecurrenceAnalysisEngine',
      semantic_tags: ['recurrence', 'root_cause', 'pattern']
    })
  })
];

module.exports = {
  QUALITY_PILOT_BLOCK_IDS,
  QUALITY_BLOCK_ALIASES,
  QUALITY_PILOT_BLOCKS
};
