'use strict';

const { createBlockDefinition } = require('./cognitiveBlockSchemas');
const { buildBlockMetadata } = require('./cognitiveBlockMetadata');

function _c(role, binding, tags = []) {
  return { composition_role: role, data_binding: binding, governance_tags: tags, compliance_tags: tags };
}
function _a(minTier, owner) {
  return { min_hierarchy_tier: minTier, domain_owner: owner, cross_domain_allowed: false };
}
function _h(op, mgmt, strat) {
  return { operational_weight: op, management_weight: mgmt, strategic_weight: strat };
}

const ENVIRONMENTAL_BLOCK_ALIASES = Object.freeze({
  'environment.emissions_monitor': 'environmental.emissions_monitor',
  'env.emissions_monitor': 'environmental.emissions_monitor'
});

const ENVIRONMENTAL_PILOT_BLOCK_IDS = Object.freeze([
  'environmental.emissions_monitor',
  'environmental.esg_governance',
  'environmental.waste_management',
  'environmental.license_compliance',
  'environmental.regulatory_risk',
  'environmental.sustainability_metrics',
  'environmental.environmental_telemetry',
  'environmental.resource_efficiency',
  'environmental.environmental_audit',
  'environmental.environmental_incidents',
  'environmental.compliance_timeline',
  'environmental.environmental_narrative',
  'environmental.contextual_environmental_ai',
  'environmental.environmental_heatmap',
  'environmental.carbon_tracking',
  'environmental.environmental_alerts'
]);

const BLOCK_META = {
  'environmental.emissions_monitor': { cat: 'emissions_monitor', label: 'Monitor Emissões', layer: 'operational', binding: 'environmental.emissions', p: 'P0', tags: ['emissions', 'compliance'], risk: 0.25 },
  'environmental.esg_governance': { cat: 'esg_governance', label: 'ESG Contextual', layer: 'governance', binding: 'environmental.esg', p: 'P0', tags: ['esg', 'governance'], risk: 0.2 },
  'environmental.waste_management': { cat: 'waste_management', label: 'Gestão Resíduos', layer: 'operational', binding: 'environmental.waste', p: 'P0', tags: ['waste', 'residuos'], risk: 0.22 },
  'environmental.license_compliance': { cat: 'license_compliance', label: 'Licenciamento', layer: 'governance', binding: 'environmental.licenses', p: 'P0', tags: ['license', 'compliance'], risk: 0.28 },
  'environmental.regulatory_risk': { cat: 'regulatory_risk', label: 'Risco Regulatório', layer: 'governance', binding: 'environmental.regulatory_risk', p: 'P0', tags: ['regulatory', 'risk'], risk: 0.3 },
  'environmental.sustainability_metrics': { cat: 'sustainability_metrics', label: 'Sustentabilidade', layer: 'operational', binding: 'environmental.sustainability', p: 'P1', tags: ['sustainability'], risk: 0.15 },
  'environmental.environmental_telemetry': { cat: 'environmental_telemetry', label: 'Telemetria Ambiental', layer: 'operational', binding: 'environmental.telemetry', p: 'P0', tags: ['telemetry'], risk: 0.18 },
  'environmental.resource_efficiency': { cat: 'resource_efficiency', label: 'Água / Energia', layer: 'operational', binding: 'environmental.resources', p: 'P1', tags: ['water', 'energy'], risk: 0.12 },
  'environmental.environmental_audit': { cat: 'environmental_audit', label: 'Auditoria Ambiental', layer: 'governance', binding: 'environmental.audit', p: 'P1', tags: ['audit'], risk: 0.2 },
  'environmental.environmental_incidents': { cat: 'environmental_incidents', label: 'Incidentes Ambientais', layer: 'operational', binding: 'environmental.incidents', p: 'P0', tags: ['incidents'], risk: 0.25 },
  'environmental.compliance_timeline': { cat: 'compliance_timeline', label: 'Vencimentos Compliance', layer: 'governance', binding: 'environmental.timeline', p: 'P0', tags: ['deadline', 'compliance'], risk: 0.26 },
  'environmental.environmental_narrative': { cat: 'environmental_narrative', label: 'Narrativa Ambiental', layer: 'strategic', binding: 'environmental.narrative', p: 'P1', tags: ['narrative'], risk: 0.08 },
  'environmental.contextual_environmental_ai': { cat: 'contextual_environmental_ai', label: 'IA Ambiental', layer: 'governance', binding: 'environmental.ai', p: 'P1', tags: ['ai'], risk: 0.1 },
  'environmental.environmental_heatmap': { cat: 'environmental_heatmap', label: 'Mapa Ambiental', layer: 'operational', binding: 'environmental.heatmap', p: 'P1', tags: ['heatmap'], risk: 0.15 },
  'environmental.carbon_tracking': { cat: 'carbon_tracking', label: 'Carbono', layer: 'operational', binding: 'environmental.carbon', p: 'P0', tags: ['carbon', 'co2'], risk: 0.2 },
  'environmental.environmental_alerts': { cat: 'environmental_alerts', label: 'Alertas Ambientais', layer: 'governance', binding: 'environmental.alerts', p: 'P0', tags: ['alerts'], risk: 0.24 }
};

const ENVIRONMENTAL_PILOT_BLOCKS = ENVIRONMENTAL_PILOT_BLOCK_IDS.map((id) => {
  const meta = BLOCK_META[id];
  return createBlockDefinition({
    id,
    domain: 'environmental',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('narrative') ? 'narrative' : id.includes('ai') ? 'assistive' : id.includes('telemetry') ? 'telemetry' : 'widget',
    semantic_layer: meta.layer,
    contract: _c(
      id.includes('telemetry') ? 'telemetry_cluster' : id.includes('heatmap') ? 'risk_map' : id.includes('governance') || id.includes('compliance') || id.includes('risk') ? 'governance_panel' : 'primary_operational',
      meta.binding,
      ['domain:environmental', 'regulatory_scope:operational', 'telemetry_dependent', ...meta.tags]
    ),
    authority: _a(meta.layer === 'governance' ? 'management' : 'coordination', 'environmental'),
    hierarchy:
      meta.layer === 'governance'
        ? _h(0.55, 0.38, 0.07)
        : meta.layer === 'strategic'
          ? _h(0.2, 0.35, 0.45)
          : _h(0.72, 0.23, 0.05),
    metadata: buildBlockMetadata({
      priority: meta.p,
      pilot_pack: 'environmental_cognitive_v1',
      engine_bridge: 'domains/environment/governance',
      telemetry_dependency: true,
      semantic_tags: meta.tags,
      environmental_risk_weight: meta.risk,
      regulatory_scope: 'environmental_operational'
    })
  });
});

module.exports = { ENVIRONMENTAL_PILOT_BLOCK_IDS, ENVIRONMENTAL_PILOT_BLOCKS, ENVIRONMENTAL_BLOCK_ALIASES };
