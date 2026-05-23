'use strict';

const { createBlockDefinition } = require('./cognitiveBlockSchemas');
const { buildBlockMetadata } = require('./cognitiveBlockMetadata');

function _c(role, binding, tags = []) {
  return { composition_role: role, data_binding: binding, governance_tags: tags, compliance_tags: tags };
}
function _a(minTier, owner) {
  return { min_hierarchy_tier: minTier, domain_owner: owner, cross_domain_allowed: true };
}
function _h(op, mgmt, strat) {
  return { operational_weight: op, management_weight: mgmt, strategic_weight: strat };
}

const EXECUTIVE_BLOCK_ALIASES = Object.freeze({
  'executive.boardroom': 'executive.boardroom_summary',
  'exec.enterprise_health': 'executive.enterprise_health'
});

const EXECUTIVE_PILOT_BLOCK_IDS = Object.freeze([
  'executive.enterprise_health',
  'executive.strategic_oee',
  'executive.cross_domain_health',
  'executive.enterprise_risk',
  'executive.boardroom_summary',
  'executive.operational_convergence',
  'executive.financial_health',
  'executive.sustainability_overview',
  'executive.people_health',
  'executive.production_stability',
  'executive.quality_reliability',
  'executive.safety_governance',
  'executive.environmental_risk',
  'executive.executive_ai',
  'executive.enterprise_maturity',
  'executive.decision_pressure',
  'executive.corporate_alignment',
  'executive.strategic_alerts'
]);

const BLOCK_META = {
  'executive.enterprise_health': { cat: 'enterprise_health', label: 'Saúde Enterprise', layer: 'strategic', binding: 'executive.enterprise_health', p: 'P0' },
  'executive.strategic_oee': { cat: 'strategic_oee', label: 'OEE Estratégico', layer: 'strategic', binding: 'executive.strategic_oee', p: 'P0' },
  'executive.cross_domain_health': { cat: 'cross_domain_health', label: 'Saúde Multi-Domínio', layer: 'strategic', binding: 'executive.cross_domain', p: 'P0' },
  'executive.enterprise_risk': { cat: 'enterprise_risk', label: 'Risco Enterprise', layer: 'strategic', binding: 'executive.risk', p: 'P0' },
  'executive.boardroom_summary': { cat: 'boardroom_summary', label: 'Boardroom Summary', layer: 'strategic', binding: 'executive.summary', p: 'P0' },
  'executive.operational_convergence': { cat: 'operational_convergence', label: 'Convergência Operacional', layer: 'strategic', binding: 'executive.convergence', p: 'P0' },
  'executive.financial_health': { cat: 'financial_health', label: 'Saúde Financeira', layer: 'strategic', binding: 'executive.financial', p: 'P1' },
  'executive.sustainability_overview': { cat: 'sustainability_overview', label: 'Sustentabilidade Estratégica', layer: 'strategic', binding: 'executive.sustainability', p: 'P1' },
  'executive.people_health': { cat: 'people_health', label: 'Saúde Organizacional', layer: 'strategic', binding: 'executive.people', p: 'P1' },
  'executive.production_stability': { cat: 'production_stability', label: 'Estabilidade Produção', layer: 'strategic', binding: 'executive.production', p: 'P0' },
  'executive.quality_reliability': { cat: 'quality_reliability', label: 'Confiabilidade Qualidade', layer: 'strategic', binding: 'executive.quality', p: 'P0' },
  'executive.safety_governance': { cat: 'safety_governance', label: 'Governança SST', layer: 'strategic', binding: 'executive.safety', p: 'P0' },
  'executive.environmental_risk': { cat: 'environmental_risk', label: 'Risco Ambiental', layer: 'strategic', binding: 'executive.environmental', p: 'P0' },
  'executive.executive_ai': { cat: 'executive_ai', label: 'IA Estratégica', layer: 'strategic', binding: 'executive.ai', p: 'P1' },
  'executive.enterprise_maturity': { cat: 'enterprise_maturity', label: 'Maturidade Enterprise', layer: 'strategic', binding: 'executive.maturity', p: 'P0' },
  'executive.decision_pressure': { cat: 'decision_pressure', label: 'Pressão Decisória', layer: 'strategic', binding: 'executive.pressure', p: 'P1' },
  'executive.corporate_alignment': { cat: 'corporate_alignment', label: 'Alinhamento Corporativo', layer: 'strategic', binding: 'executive.alignment', p: 'P1' },
  'executive.strategic_alerts': { cat: 'strategic_alerts', label: 'Alertas Estratégicos', layer: 'strategic', binding: 'executive.alerts', p: 'P0' }
};

const EXECUTIVE_PILOT_BLOCKS = EXECUTIVE_PILOT_BLOCK_IDS.map((id) => {
  const meta = BLOCK_META[id];
  return createBlockDefinition({
    id,
    domain: 'executive',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('ai') ? 'assistive' : id.includes('summary') || id.includes('narrative') ? 'narrative' : 'widget',
    semantic_layer: meta.layer,
    contract: _c('strategic_overview', meta.binding, ['domain:executive', 'strategic_scope:enterprise', 'aggregation:supervised']),
    authority: _a('executive', 'executive'),
    hierarchy: _h(0.05, 0.2, 0.75),
    metadata: buildBlockMetadata({
      priority: meta.p,
      semantic_tags: ['boardroom', 'strategic', meta.cat],
      delivery_mode: 'shadow_first'
    })
  });
});

module.exports = {
  EXECUTIVE_PILOT_BLOCKS,
  EXECUTIVE_PILOT_BLOCK_IDS,
  EXECUTIVE_BLOCK_ALIASES
};
