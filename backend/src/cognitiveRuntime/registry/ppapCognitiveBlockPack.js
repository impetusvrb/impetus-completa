'use strict';

/**
 * GF-001 — Pacote oficial ppap_native (registry only, sem processamento).
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

const PPAP_PILOT_BLOCK_IDS = Object.freeze([
  'ppap.submission_management',
  'ppap.supplier_approval',
  'ppap.dimensional_validation',
  'ppap.material_certification',
  'ppap.process_capability',
  'ppap.appearance_approval',
  'ppap.performance_validation',
  'ppap.document_package',
  'ppap.engineering_change',
  'ppap.customer_requirements',
  'ppap.contextual_ppap_ai',
  'ppap.ppap_narrative'
]);

const PPAP_BLOCK_ALIASES = Object.freeze({});

const BLOCK_META = {
  'ppap.submission_management': { cat: 'submission_management', label: 'Gestão de Submissões', layer: 'operational', binding: 'ppap.submissions', p: 'P0' },
  'ppap.supplier_approval': { cat: 'supplier_approval', label: 'Aprovação Fornecedor', layer: 'management', binding: 'ppap.supplier_approval', p: 'P0' },
  'ppap.dimensional_validation': { cat: 'dimensional_validation', label: 'Validação Dimensional', layer: 'operational', binding: 'ppap.dimensional', p: 'P0' },
  'ppap.material_certification': { cat: 'material_certification', label: 'Certificação Material', layer: 'operational', binding: 'ppap.material_cert', p: 'P1' },
  'ppap.process_capability': { cat: 'process_capability', label: 'Capacidade de Processo', layer: 'operational', binding: 'ppap.capability', p: 'P0' },
  'ppap.appearance_approval': { cat: 'appearance_approval', label: 'Aprovação Aparência', layer: 'operational', binding: 'ppap.appearance', p: 'P1' },
  'ppap.performance_validation': { cat: 'performance_validation', label: 'Validação Desempenho', layer: 'operational', binding: 'ppap.performance', p: 'P1' },
  'ppap.document_package': { cat: 'document_package', label: 'Pacote Documental', layer: 'governance', binding: 'ppap.documents', p: 'P0' },
  'ppap.engineering_change': { cat: 'engineering_change', label: 'Alteração Engenharia', layer: 'management', binding: 'ppap.ecn', p: 'P1' },
  'ppap.customer_requirements': { cat: 'customer_requirements', label: 'Requisitos Cliente', layer: 'management', binding: 'ppap.customer_req', p: 'P1' },
  'ppap.contextual_ppap_ai': { cat: 'contextual_ppap_ai', label: 'IA Contextual PPAP', layer: 'governance', binding: 'ppap.contextual_ai', p: 'P2' },
  'ppap.ppap_narrative': { cat: 'ppap_narrative', label: 'Narrativa PPAP', layer: 'strategic', binding: 'ppap.narrative', p: 'P2' }
};

const PPAP_PILOT_BLOCKS = PPAP_PILOT_BLOCK_IDS.map((id) => {
  const meta = BLOCK_META[id];
  return createBlockDefinition({
    id,
    domain: 'ppap',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('narrative') ? 'narrative' : id.includes('ai') ? 'assistive' : 'widget',
    semantic_layer: meta.layer,
    contract: _contract(
      meta.layer === 'governance' || meta.layer === 'strategic' ? 'governance_panel' : 'primary_operational',
      meta.binding,
      ['domain:ppap', 'domain:quality', 'pilot:ppap_cognitive_v1', 'inactive:true']
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
      pilot_pack: 'ppap_cognitive_v1',
      foundation_only: true,
      active: false,
      semantic_tags: [meta.cat, 'ppap', 'inactive']
    })
  });
});

module.exports = {
  PPAP_PILOT_BLOCK_IDS,
  PPAP_BLOCK_ALIASES,
  PPAP_PILOT_BLOCKS
};
