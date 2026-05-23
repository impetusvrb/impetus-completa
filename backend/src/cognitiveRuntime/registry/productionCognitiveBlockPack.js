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

const PRODUCTION_BLOCK_ALIASES = Object.freeze({
  'production.line_oee': 'production.oee_contextual',
  'prod.line_oee': 'production.oee_contextual'
});

const PRODUCTION_PILOT_BLOCK_IDS = Object.freeze([
  'production.oee_contextual',
  'production.line_efficiency',
  'production.throughput_monitor',
  'production.downtime_analysis',
  'production.scrap_intelligence',
  'production.bottleneck_heatmap',
  'production.process_stability',
  'production.machine_health',
  'production.telemetry_center',
  'production.energy_efficiency',
  'production.shift_performance',
  'production.predictive_anomalies',
  'production.operational_ai',
  'production.production_narrative',
  'production.maintenance_correlation',
  'production.quality_correlation'
]);

const PRODUCTION_PILOT_BLOCKS = PRODUCTION_PILOT_BLOCK_IDS.map((id) => {
  const meta = {
    'production.oee_contextual': { cat: 'oee_contextual', label: 'OEE Contextual', layer: 'operational', binding: 'production.oee_contextual', p: 'P0', tags: ['oee', 'telemetry'] },
    'production.line_efficiency': { cat: 'line_efficiency', label: 'Eficiência por Linha', layer: 'operational', binding: 'production.line_efficiency', p: 'P0', tags: ['efficiency', 'line'] },
    'production.throughput_monitor': { cat: 'throughput_monitor', label: 'Throughput', layer: 'operational', binding: 'production.throughput', p: 'P0', tags: ['throughput'] },
    'production.downtime_analysis': { cat: 'downtime_analysis', label: 'Análise Paradas', layer: 'operational', binding: 'production.downtime', p: 'P0', tags: ['downtime', 'uptime'] },
    'production.scrap_intelligence': { cat: 'scrap_intelligence', label: 'Scrap / Perdas', layer: 'operational', binding: 'production.scrap', p: 'P0', tags: ['scrap', 'waste'] },
    'production.bottleneck_heatmap': { cat: 'bottleneck_heatmap', label: 'Heatmap Gargalos', layer: 'operational', binding: 'production.bottleneck', p: 'P0', tags: ['bottleneck'] },
    'production.process_stability': { cat: 'process_stability', label: 'Estabilidade Processo', layer: 'operational', binding: 'production.stability', p: 'P1', tags: ['stability'] },
    'production.machine_health': { cat: 'machine_health', label: 'Saúde Máquinas', layer: 'operational', binding: 'production.machine_health', p: 'P1', tags: ['machine', 'sensor'] },
    'production.telemetry_center': { cat: 'telemetry_center', label: 'Telemetria Industrial', layer: 'operational', binding: 'production.telemetry', p: 'P0', tags: ['telemetry', 'plc'] },
    'production.energy_efficiency': { cat: 'energy_efficiency', label: 'Eficiência Energética', layer: 'operational', binding: 'production.energy', p: 'P2', tags: ['energy'] },
    'production.shift_performance': { cat: 'shift_performance', label: 'Performance Turno', layer: 'operational', binding: 'production.shift', p: 'P0', tags: ['shift'] },
    'production.predictive_anomalies': { cat: 'predictive_anomalies', label: 'Anomalias Preditivas', layer: 'governance', binding: 'production.anomaly', p: 'P1', tags: ['anomaly'] },
    'production.operational_ai': { cat: 'operational_ai', label: 'IA Operacional Produção', layer: 'operational', binding: 'production.contextual_ai', p: 'P1', tags: ['ai'] },
    'production.production_narrative': { cat: 'production_narrative', label: 'Narrativa Produção', layer: 'strategic', binding: 'production.narrative', p: 'P1', tags: ['narrative'] },
    'production.maintenance_correlation': { cat: 'maintenance_correlation', label: 'Correlação Manutenção', layer: 'governance', binding: 'production.maintenance_corr', p: 'P1', tags: ['maintenance', 'correlation_internal'] },
    'production.quality_correlation': { cat: 'quality_correlation', label: 'Correlação Qualidade', layer: 'governance', binding: 'production.quality_corr', p: 'P1', tags: ['quality', 'correlation_internal'] }
  }[id];

  return createBlockDefinition({
    id,
    domain: 'production',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('narrative') ? 'narrative' : id.includes('ai') ? 'assistive' : id.includes('telemetry') ? 'telemetry' : 'widget',
    semantic_layer: meta.layer,
    contract: _c(
      id.includes('telemetry') ? 'telemetry_cluster' : id.includes('heatmap') ? 'risk_map' : 'primary_operational',
      meta.binding,
      ['domain:production', 'telemetry_dependent', ...meta.tags]
    ),
    authority: _a(id.includes('governance') ? 'management' : 'supervision', 'production'),
    hierarchy:
      meta.layer === 'governance'
        ? _h(0.55, 0.38, 0.07)
        : meta.layer === 'strategic'
          ? _h(0.2, 0.35, 0.45)
          : _h(0.82, 0.13, 0.05),
    metadata: buildBlockMetadata({
      priority: meta.p,
      pilot_pack: 'production_cognitive_v1',
      engine_bridge: 'services/productionRealtimeService',
      telemetry_dependency: true,
      semantic_tags: meta.tags
    })
  });
});

module.exports = { PRODUCTION_PILOT_BLOCK_IDS, PRODUCTION_PILOT_BLOCKS, PRODUCTION_BLOCK_ALIASES };
