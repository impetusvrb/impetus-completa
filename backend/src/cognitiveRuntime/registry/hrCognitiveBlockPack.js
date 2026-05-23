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

const HR_BLOCK_ALIASES = Object.freeze({
  'rh.people_analytics': 'hr.people_analytics',
  'rh.turnover_heatmap': 'hr.turnover_heatmap',
  'rh.pulse_climate': 'hr.workforce_health'
});

const HR_PILOT_BLOCK_IDS = Object.freeze([
  'hr.people_analytics',
  'hr.turnover_heatmap',
  'hr.absenteeism_monitor',
  'hr.training_governance',
  'hr.performance_distribution',
  'hr.recruitment_pipeline',
  'hr.retention_risk',
  'hr.behavioral_insights',
  'hr.workforce_health',
  'hr.contextual_hr_ai',
  'hr.hr_narrative'
]);

const HR_PILOT_BLOCKS = [
  createBlockDefinition({
    id: 'hr.people_analytics',
    domain: 'hr',
    semantic_category: 'people_analytics',
    label: 'People Analytics',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('primary_operational', 'hr.workforce_metrics', ['domain:hr', 'pilot:hr']),
    authority: _a('coordination', 'hr'),
    hierarchy: _h(0.75, 0.2, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', engine_bridge: 'services/hrIntelligenceService', semantic_tags: ['workforce', 'headcount'] })
  }),
  createBlockDefinition({
    id: 'hr.turnover_heatmap',
    domain: 'hr',
    semantic_category: 'turnover_heatmap',
    label: 'Turnover Heatmap',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('telemetry_cluster', 'hr.turnover_series', ['domain:hr']),
    authority: _a('management', 'hr'),
    hierarchy: _h(0.7, 0.25, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['turnover', 'retention'] })
  }),
  createBlockDefinition({
    id: 'hr.absenteeism_monitor',
    domain: 'hr',
    semantic_category: 'absenteeism_monitor',
    label: 'Monitor Absenteísmo',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('compliance_panel', 'hr.absence_index', ['domain:hr']),
    authority: _a('supervision', 'hr'),
    hierarchy: _h(0.78, 0.17, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['absenteeism', 'attendance'] })
  }),
  createBlockDefinition({
    id: 'hr.training_governance',
    domain: 'hr',
    semantic_category: 'training_governance',
    label: 'Governança Treinamentos',
    surface: 'widget',
    semantic_layer: 'governance',
    contract: _c('governance_panel', 'hr.training_compliance', ['domain:hr']),
    authority: _a('coordination', 'hr'),
    hierarchy: _h(0.55, 0.38, 0.07),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['training', 'capacitation'] })
  }),
  createBlockDefinition({
    id: 'hr.performance_distribution',
    domain: 'hr',
    semantic_category: 'performance_distribution',
    label: 'Distribuição Performance',
    surface: 'widget',
    semantic_layer: 'management',
    contract: _c('hr_panel', 'hr.performance_metrics', ['domain:hr']),
    authority: _a('management', 'hr'),
    hierarchy: _h(0.5, 0.4, 0.1),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['performance'] })
  }),
  createBlockDefinition({
    id: 'hr.recruitment_pipeline',
    domain: 'hr',
    semantic_category: 'recruitment_pipeline',
    label: 'Pipeline Recrutamento',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('pipeline_panel', 'hr.open_positions', ['domain:hr']),
    authority: _a('coordination', 'hr'),
    hierarchy: _h(0.72, 0.23, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['recruitment', 'hiring'] })
  }),
  createBlockDefinition({
    id: 'hr.retention_risk',
    domain: 'hr',
    semantic_category: 'retention_risk',
    label: 'Risco Retenção',
    surface: 'widget',
    semantic_layer: 'governance',
    contract: _c('risk_panel', 'hr.retention_risk', ['domain:hr']),
    authority: _a('management', 'hr'),
    hierarchy: _h(0.45, 0.45, 0.1),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['retention', 'turnover'] })
  }),
  createBlockDefinition({
    id: 'hr.behavioral_insights',
    domain: 'hr',
    semantic_category: 'behavioral_insights',
    label: 'Insights Comportamentais',
    surface: 'insight_panel',
    semantic_layer: 'operational',
    contract: _c('behavior_panel', 'hr.behavior_analytics', ['domain:hr']),
    authority: _a('coordination', 'hr'),
    hierarchy: _h(0.68, 0.27, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['behavior', 'culture'] })
  }),
  createBlockDefinition({
    id: 'hr.workforce_health',
    domain: 'hr',
    semantic_category: 'workforce_health',
    label: 'Saúde Organizacional',
    surface: 'widget',
    semantic_layer: 'operational',
    contract: _c('climate_panel', 'hr.pulse_climate', ['domain:hr']),
    authority: _a('coordination', 'hr'),
    hierarchy: _h(0.7, 0.25, 0.05),
    metadata: buildBlockMetadata({ priority: 'P0', semantic_tags: ['pulse', 'climate', 'wellbeing'] })
  }),
  createBlockDefinition({
    id: 'hr.contextual_hr_ai',
    domain: 'hr',
    semantic_category: 'contextual_hr_ai',
    label: 'IA Contextual RH',
    surface: 'assistive',
    semantic_layer: 'operational',
    contract: _c('contextual_ai', 'hr.contextual_ai', ['domain:hr', 'assistive_only']),
    authority: _a('coordination', 'hr'),
    hierarchy: _h(0.65, 0.3, 0.05),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['contextual_ai', 'people'] })
  }),
  createBlockDefinition({
    id: 'hr.hr_narrative',
    domain: 'hr',
    semantic_category: 'hr_narrative',
    label: 'Narrativa RH',
    surface: 'narrative',
    semantic_layer: 'strategic',
    contract: _c('narrative', 'hr.executive_narrative', ['domain:hr']),
    authority: _a('management', 'hr'),
    hierarchy: _h(0.25, 0.35, 0.4),
    metadata: buildBlockMetadata({ priority: 'P1', semantic_tags: ['narrative', 'people_governance'] })
  })
];

module.exports = { HR_PILOT_BLOCK_IDS, HR_PILOT_BLOCKS, HR_BLOCK_ALIASES };
