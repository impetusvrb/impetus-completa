'use strict';

const { createBlockDefinition } = require('./cognitiveBlockSchemas');
const { buildBlockMetadata } = require('./cognitiveBlockMetadata');

function _c(role, binding, tags = []) {
  return { composition_role: role, data_binding: binding, governance_tags: tags };
}
function _a(minTier, owner) {
  return { min_hierarchy_tier: minTier, domain_owner: owner, cross_domain_allowed: false };
}
function _h(op, mgmt, strat) {
  return { operational_weight: op, management_weight: mgmt, strategic_weight: strat };
}

const SST_BLOCK_ALIASES = Object.freeze({
  'sst.incident_heatmap': 'sst.incident_intelligence',
  'sst.permit_to_work': 'sst.permit_governance',
  'sst.epi_compliance': 'sst.ppe_compliance'
});

const SST_PILOT_BLOCK_IDS = Object.freeze([
  'sst.incident_intelligence',
  'sst.permit_governance',
  'sst.ppe_compliance',
  'sst.hazard_heatmap',
  'sst.field_occurrences',
  'sst.risk_matrix',
  'sst.safety_telemetry',
  'sst.safety_narrative',
  'sst.safety_ai'
]);

const SST_PILOT_BLOCKS = [
  createBlockDefinition({
    id: 'sst.incident_intelligence',
    domain: 'safety',
    semantic_category: 'incident_intelligence',
    label: 'Inteligência de Incidentes',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('primary_operational', 'safety.incident_events', ['domain:safety', 'pilot:sst']),
    authority: _a('coordination', 'safety'),
    hierarchy: _h(0.82, 0.13, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', pilot_pack: 'sst_cognitive_v1', semantic_tags: ['incident', 'near_miss'] })
  }),
  createBlockDefinition({
    id: 'sst.permit_governance',
    domain: 'safety',
    semantic_category: 'permit_governance',
    label: 'Governança APR/PT/LOTO',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('permit_panel', 'safety.permit_workflow', ['domain:safety', 'compliance:pt']),
    authority: _a('supervision', 'safety'),
    hierarchy: _h(0.8, 0.15, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['apr', 'pt', 'loto'] })
  }),
  createBlockDefinition({
    id: 'sst.ppe_compliance',
    domain: 'safety',
    semantic_category: 'ppe_compliance',
    label: 'Compliance EPI/EPC',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('compliance_panel', 'safety.epi_status', ['domain:safety']),
    authority: _a('supervision', 'safety'),
    hierarchy: _h(0.78, 0.17, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['epi', 'epc', 'ppe'] })
  }),
  createBlockDefinition({
    id: 'sst.hazard_heatmap',
    domain: 'safety',
    semantic_category: 'hazard_heatmap',
    label: 'Heatmap de Risco',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('risk_map', 'safety.hazard_zones', ['domain:safety']),
    authority: _a('coordination', 'safety'),
    hierarchy: _h(0.75, 0.2, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['hazard', 'heatmap'] })
  }),
  createBlockDefinition({
    id: 'sst.field_occurrences',
    domain: 'safety',
    semantic_category: 'field_occurrences',
    label: 'Ocorrências de Campo',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('field_panel', 'safety.field_events', ['domain:safety']),
    authority: _a('supervision', 'safety'),
    hierarchy: _h(0.72, 0.23, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['field', 'occurrence'] })
  }),
  createBlockDefinition({
    id: 'sst.risk_matrix',
    domain: 'safety',
    semantic_category: 'risk_matrix',
    label: 'Matriz de Risco',
    surface: 'widget',
    semantic_layer: 'governance',
    contract: _c('governance_panel', 'safety.risk_matrix', ['domain:safety']),
    authority: _a('coordination', 'safety'),
    hierarchy: _h(0.55, 0.38, 0.07),
    metadata: buildBlockMetadata({ priority: 'P1', engine_bridge: 'domains/safety/governance/risk/safetyRiskMatrixEngine' })
  }),
  createBlockDefinition({
    id: 'sst.safety_telemetry',
    domain: 'safety',
    semantic_category: 'safety_telemetry',
    label: 'Telemetria SST',
    surface: 'telemetry',
    semantic_layer: 'operational',
    contract: _c('telemetry_cluster', 'safety.telemetry', ['domain:safety']),
    authority: _a('supervision', 'safety'),
    hierarchy: _h(0.8, 0.15, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['telemetry', 'unsafe_pattern'] })
  }),
  createBlockDefinition({
    id: 'sst.safety_narrative',
    domain: 'safety',
    semantic_category: 'safety_narrative',
    label: 'Narrativa SST',
    surface: 'narrative',
    semantic_layer: 'strategic',
    contract: _c('narrative', 'safety.executive_narrative', ['domain:safety']),
    authority: _a('management', 'safety'),
    hierarchy: _h(0.2, 0.35, 0.45),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['narrative', 'safety'] })
  }),
  createBlockDefinition({
    id: 'sst.safety_ai',
    domain: 'safety',
    semantic_category: 'safety_ai',
    label: 'IA Contextual SST',
    surface: 'assistive',
    semantic_layer: 'operational',
    contract: _c('contextual_ai', 'safety.contextual_ai', ['domain:safety', 'assistive_only']),
    authority: _a('coordination', 'safety'),
    hierarchy: _h(0.7, 0.25, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['contextual_ai', 'safety'] })
  })
];

module.exports = { SST_PILOT_BLOCK_IDS, SST_PILOT_BLOCKS, SST_BLOCK_ALIASES };
