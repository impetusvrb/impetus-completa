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

const MAINTENANCE_BLOCK_ALIASES = Object.freeze({
  'maint.asset_health': 'maintenance.asset_health',
  'maintenance.asset-health': 'maintenance.asset_health'
});

const MAINTENANCE_PILOT_BLOCK_IDS = Object.freeze([
  'maintenance.asset_health',
  'maintenance.mtbf_mttr',
  'maintenance.predictive_failure',
  'maintenance.machine_stability',
  'maintenance.preventive_schedule',
  'maintenance.breakdown_heatmap',
  'maintenance.parts_risk',
  'maintenance.downtime_correlation',
  'maintenance.reliability_center',
  'maintenance.failure_patterns',
  'maintenance.machine_degradation',
  'maintenance.maintenance_ai',
  'maintenance.maintenance_narrative',
  'maintenance.predictive_alerts',
  'maintenance.maintenance_governance',
  'maintenance.maintenance_usefulness',
  'maintenance.asset_criticality',
  'maintenance.telemetry_reliability'
]);

const BLOCK_META = {
  'maintenance.asset_health': { cat: 'asset_health', label: 'Saúde Ativos', layer: 'operational', binding: 'maintenance.asset_health', p: 'M1', tags: ['health', 'asset'], risk: 0.22 },
  'maintenance.mtbf_mttr': { cat: 'mtbf_mttr', label: 'MTBF / MTTR', layer: 'operational', binding: 'maintenance.mtbf_mttr', p: 'M1', tags: ['mtbf', 'mttr'], risk: 0.18 },
  'maintenance.predictive_failure': { cat: 'predictive_failure', label: 'Risco Falha', layer: 'governance', binding: 'maintenance.predictive', p: 'M1', tags: ['predictive', 'failure'], risk: 0.28 },
  'maintenance.machine_stability': { cat: 'machine_stability', label: 'Estabilidade Máquina', layer: 'operational', binding: 'maintenance.stability', p: 'M1', tags: ['stability'], risk: 0.24 },
  'maintenance.preventive_schedule': { cat: 'preventive_schedule', label: 'Preventiva', layer: 'operational', binding: 'maintenance.preventive', p: 'M1', tags: ['preventive'], risk: 0.15 },
  'maintenance.breakdown_heatmap': { cat: 'breakdown_heatmap', label: 'Heatmap Paragens', layer: 'operational', binding: 'maintenance.heatmap', p: 'M1', tags: ['breakdown', 'heatmap'], risk: 0.2 },
  'maintenance.parts_risk': { cat: 'parts_risk', label: 'Risco Peças', layer: 'governance', binding: 'maintenance.parts', p: 'M1', tags: ['parts', 'risk'], risk: 0.2 },
  'maintenance.downtime_correlation': { cat: 'downtime_correlation', label: 'Correlação Downtime', layer: 'operational', binding: 'maintenance.downtime', p: 'M1', tags: ['downtime'], risk: 0.22 },
  'maintenance.reliability_center': { cat: 'reliability_center', label: 'Centro Confiabilidade', layer: 'governance', binding: 'maintenance.reliability', p: 'M1', tags: ['reliability'], risk: 0.25 },
  'maintenance.failure_patterns': { cat: 'failure_patterns', label: 'Padrões Falha', layer: 'operational', binding: 'maintenance.patterns', p: 'M1', tags: ['failure', 'patterns'], risk: 0.23 },
  'maintenance.machine_degradation': { cat: 'machine_degradation', label: 'Degradação', layer: 'operational', binding: 'maintenance.degradation', p: 'M1', tags: ['degradation'], risk: 0.26 },
  'maintenance.maintenance_ai': { cat: 'maintenance_ai', label: 'IA Manutenção', layer: 'governance', binding: 'maintenance.ai', p: 'M1', tags: ['ai'], risk: 0.1 },
  'maintenance.maintenance_narrative': { cat: 'maintenance_narrative', label: 'Narrativa Confiabilidade', layer: 'strategic', binding: 'maintenance.narrative', p: 'M1', tags: ['narrative'], risk: 0.08 },
  'maintenance.predictive_alerts': { cat: 'predictive_alerts', label: 'Alertas Preditivos', layer: 'governance', binding: 'maintenance.alerts', p: 'M1', tags: ['alerts', 'predictive'], risk: 0.27 },
  'maintenance.maintenance_governance': { cat: 'maintenance_governance', label: 'Governança Manutenção', layer: 'governance', binding: 'maintenance.governance', p: 'M1', tags: ['governance'], risk: 0.2 },
  'maintenance.maintenance_usefulness': { cat: 'maintenance_usefulness', label: 'Utilidade Manutenção', layer: 'governance', binding: 'maintenance.usefulness', p: 'M1', tags: ['usefulness'], risk: 0.12 },
  'maintenance.asset_criticality': { cat: 'asset_criticality', label: 'Criticidade Ativos', layer: 'governance', binding: 'maintenance.criticality', p: 'M1', tags: ['criticality'], risk: 0.24 },
  'maintenance.telemetry_reliability': { cat: 'telemetry_reliability', label: 'Telemetria Confiabilidade', layer: 'operational', binding: 'maintenance.telemetry', p: 'M1', tags: ['telemetry'], risk: 0.18 }
};

const MAINTENANCE_PILOT_BLOCKS = MAINTENANCE_PILOT_BLOCK_IDS.map((id) => {
  const meta = BLOCK_META[id];
  return createBlockDefinition({
    id,
    domain: 'maintenance',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('narrative') ? 'narrative' : id.includes('ai') ? 'assistive' : id.includes('telemetry') ? 'telemetry' : 'widget',
    semantic_layer: meta.layer,
    contract: _c(
      id.includes('telemetry') ? 'telemetry_cluster' : id.includes('heatmap') ? 'risk_map' : id.includes('governance') || id.includes('predictive') || id.includes('criticality') ? 'governance_panel' : 'primary_operational',
      meta.binding,
      ['domain:maintenance', 'reliability_scope:operational', 'telemetry_dependent', ...meta.tags]
    ),
    authority: _a(meta.layer === 'governance' ? 'management' : 'coordination', 'maintenance'),
    hierarchy:
      meta.layer === 'governance'
        ? _h(0.55, 0.38, 0.07)
        : meta.layer === 'strategic'
          ? _h(0.2, 0.35, 0.45)
          : _h(0.72, 0.23, 0.05),
    metadata: buildBlockMetadata({
      phase: meta.p,
      risk_weight: meta.risk,
      pilot_eligible: true,
      shadow_first: true,
      auto_action: false
    })
  });
});

module.exports = {
  MAINTENANCE_BLOCK_ALIASES,
  MAINTENANCE_PILOT_BLOCK_IDS,
  MAINTENANCE_PILOT_BLOCKS,
  getMaintenancePilotBlocks: () => MAINTENANCE_PILOT_BLOCKS.slice()
};
