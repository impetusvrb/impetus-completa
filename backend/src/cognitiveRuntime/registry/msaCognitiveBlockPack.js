'use strict';

/**
 * GF-008 — Pacote oficial msa_native (registry only, sem processamento).
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

const MSA_PILOT_BLOCK_IDS = Object.freeze([
  'msa.measurement_system_registry',
  'msa.gauge_inventory',
  'msa.variable_grr',
  'msa.attribute_agreement',
  'msa.bias_analysis',
  'msa.linearity_analysis',
  'msa.stability_analysis',
  'msa.measurement_capability',
  'msa.calibration_monitoring',
  'msa.study_governance',
  'msa.contextual_msa_ai',
  'msa.msa_narrative'
]);

const MSA_BLOCK_ALIASES = Object.freeze({});

const BLOCK_META = {
  'msa.measurement_system_registry': { cat: 'measurement_system_registry', label: 'Registo Sistema de Medição', layer: 'governance', binding: 'msa.registry', p: 'P0' },
  'msa.gauge_inventory': { cat: 'gauge_inventory', label: 'Inventário Instrumentos', layer: 'operational', binding: 'msa.gages', p: 'P0' },
  'msa.variable_grr': { cat: 'variable_grr', label: 'GRR Variável', layer: 'operational', binding: 'msa.grr', p: 'P0' },
  'msa.attribute_agreement': { cat: 'attribute_agreement', label: 'Concordância Atributo', layer: 'operational', binding: 'msa.attribute', p: 'P0' },
  'msa.bias_analysis': { cat: 'bias_analysis', label: 'Análise de Viés', layer: 'operational', binding: 'msa.bias', p: 'P1' },
  'msa.linearity_analysis': { cat: 'linearity_analysis', label: 'Análise de Linearidade', layer: 'operational', binding: 'msa.linearity', p: 'P1' },
  'msa.stability_analysis': { cat: 'stability_analysis', label: 'Análise de Estabilidade', layer: 'operational', binding: 'msa.stability', p: 'P1' },
  'msa.measurement_capability': { cat: 'measurement_capability', label: 'Capacidade de Medição', layer: 'operational', binding: 'msa.capability', p: 'P0' },
  'msa.calibration_monitoring': { cat: 'calibration_monitoring', label: 'Monitorização Calibração', layer: 'management', binding: 'msa.calibration', p: 'P1' },
  'msa.study_governance': { cat: 'study_governance', label: 'Governança de Estudos', layer: 'governance', binding: 'msa.governance', p: 'P0' },
  'msa.contextual_msa_ai': { cat: 'contextual_msa_ai', label: 'IA Contextual MSA', layer: 'governance', binding: 'msa.contextual_ai', p: 'P2' },
  'msa.msa_narrative': { cat: 'msa_narrative', label: 'Narrativa MSA', layer: 'strategic', binding: 'msa.narrative', p: 'P2' }
};

const MSA_PILOT_BLOCKS = MSA_PILOT_BLOCK_IDS.map((id) => {
  const meta = BLOCK_META[id];
  return createBlockDefinition({
    id,
    domain: 'msa',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('narrative') ? 'narrative' : id.includes('ai') ? 'assistive' : 'widget',
    semantic_layer: meta.layer,
    contract: _contract(
      meta.layer === 'governance' || meta.layer === 'strategic' ? 'governance_panel' : 'primary_operational',
      meta.binding,
      ['domain:msa', 'domain:quality', 'pilot:msa_cognitive_v1', 'inactive:true']
    ),
    authority: _authority(meta.layer === 'management' ? 'management' : 'coordination', 'quality'),
    hierarchy:
      meta.layer === 'strategic'
        ? _hierarchy(0.2, 0.3, 0.5)
        : meta.layer === 'management'
          ? _hierarchy(0.45, 0.45, 0.1)
          : _hierarchy(0.75, 0.2, 0.05),
    metadata: buildBlockMetadata({
      priority: meta.p,
      pilot_pack: 'msa_cognitive_v1',
      foundation_only: true,
      active: false,
      semantic_tags: [meta.cat, 'msa', 'inactive']
    })
  });
});

module.exports = {
  MSA_PILOT_BLOCK_IDS,
  MSA_BLOCK_ALIASES,
  MSA_PILOT_BLOCKS
};
