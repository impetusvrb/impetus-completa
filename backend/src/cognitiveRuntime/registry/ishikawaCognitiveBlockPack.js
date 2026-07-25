'use strict';

/**
 * GF-015 — Pacote oficial ishikawa_native (registry only, sem processamento).
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

const ISHIKAWA_PILOT_BLOCK_IDS = Object.freeze([
  'ishikawa.investigation_registry',
  'ishikawa.root_cause_repository',
  'ishikawa.fishbone_analysis',
  'ishikawa.five_whys',
  'ishikawa.corrective_actions',
  'ishikawa.preventive_actions',
  'ishikawa.evidence_repository',
  'ishikawa.investigation_workflow',
  'ishikawa.contextual_root_cause_ai',
  'ishikawa.organizational_learning',
  'ishikawa.recurrence_monitor',
  'ishikawa.ishikawa_narrative'
]);

const ISHIKAWA_BLOCK_ALIASES = Object.freeze({});

const BLOCK_META = {
  'ishikawa.investigation_registry': { cat: 'investigation_registry', label: 'Registo de Investigações', layer: 'governance', binding: 'ishikawa.registry', p: 'P0' },
  'ishikawa.root_cause_repository': { cat: 'root_cause_repository', label: 'Repositório Causa Raiz', layer: 'governance', binding: 'ishikawa.root_causes', p: 'P0' },
  'ishikawa.fishbone_analysis': { cat: 'fishbone_analysis', label: 'Análise Fishbone', layer: 'operational', binding: 'ishikawa.fishbone', p: 'P0' },
  'ishikawa.five_whys': { cat: 'five_whys', label: '5 Porquês', layer: 'operational', binding: 'ishikawa.five_whys', p: 'P0' },
  'ishikawa.corrective_actions': { cat: 'corrective_actions', label: 'Ações Corretivas', layer: 'management', binding: 'ishikawa.corrective', p: 'P0' },
  'ishikawa.preventive_actions': { cat: 'preventive_actions', label: 'Ações Preventivas', layer: 'management', binding: 'ishikawa.preventive', p: 'P1' },
  'ishikawa.evidence_repository': { cat: 'evidence_repository', label: 'Repositório de Evidências', layer: 'operational', binding: 'ishikawa.evidence', p: 'P0' },
  'ishikawa.investigation_workflow': { cat: 'investigation_workflow', label: 'Workflow de Investigação', layer: 'governance', binding: 'ishikawa.workflow', p: 'P0' },
  'ishikawa.contextual_root_cause_ai': { cat: 'contextual_root_cause_ai', label: 'IA Contextual RCA', layer: 'governance', binding: 'ishikawa.contextual_ai', p: 'P2' },
  'ishikawa.organizational_learning': { cat: 'organizational_learning', label: 'Aprendizagem Organizacional', layer: 'strategic', binding: 'ishikawa.learning', p: 'P2' },
  'ishikawa.recurrence_monitor': { cat: 'recurrence_monitor', label: 'Monitor de Recorrência', layer: 'management', binding: 'ishikawa.recurrence', p: 'P1' },
  'ishikawa.ishikawa_narrative': { cat: 'ishikawa_narrative', label: 'Narrativa Ishikawa', layer: 'strategic', binding: 'ishikawa.narrative', p: 'P2' }
};

const ISHIKAWA_PILOT_BLOCKS = ISHIKAWA_PILOT_BLOCK_IDS.map((id) => {
  const meta = BLOCK_META[id];
  return createBlockDefinition({
    id,
    domain: 'ishikawa',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('narrative') ? 'narrative' : id.includes('ai') ? 'assistive' : 'widget',
    semantic_layer: meta.layer,
    contract: _contract(
      meta.layer === 'governance' || meta.layer === 'strategic' ? 'governance_panel' : 'primary_operational',
      meta.binding,
      ['domain:ishikawa', 'domain:quality', 'pilot:ishikawa_cognitive_v1', 'inactive:true']
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
      pilot_pack: 'ishikawa_cognitive_v1',
      foundation_only: true,
      active: false,
      semantic_tags: [meta.cat, 'ishikawa', 'inactive']
    })
  });
});

module.exports = {
  ISHIKAWA_PILOT_BLOCK_IDS,
  ISHIKAWA_BLOCK_ALIASES,
  ISHIKAWA_PILOT_BLOCKS
};
