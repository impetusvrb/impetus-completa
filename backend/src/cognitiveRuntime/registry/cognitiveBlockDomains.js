'use strict';

/**
 * Semantic domain ownership — alinhado a domainAuthority / functional_axis.
 * Blocks MUST declare domain_owner matching one of these axes.
 */
const DOMAIN_AXES = Object.freeze({
  quality: {
    axis: 'quality',
    label: 'Qualidade',
    generic_patterns: [
      /uptime|oee\s*global|efici[eê]ncia\s*industrial|centro\s*de\s*opera[çc][õo]es|produ[çc][aã]o\s*total/i
    ],
    ideal_semantic_categories: [
      'nc_center',
      'capa_engine',
      'spc_monitor',
      'audit_governance',
      'supplier_quality',
      'inspection_ops',
      'contextual_ai'
    ]
  },
  safety: {
    axis: 'safety',
    label: 'SST / Segurança',
    generic_patterns: [/qualidade\s*geral|faturamento|margem/i],
    ideal_semantic_categories: ['incident_heatmap', 'permit_to_work', 'epi_compliance', 'ghe_monitor']
  },
  rh: {
    axis: 'rh',
    label: 'Recursos Humanos',
    generic_patterns: [/oee|produ[çc][aã]o|ncr|spc/i],
    ideal_semantic_categories: ['people_analytics', 'turnover_heatmap', 'pulse_climate']
  },
  executive: {
    axis: 'executive',
    label: 'Executivo / Boardroom',
    generic_patterns: [/inspe[çc][aã]o\s*pendente|ncr\s*aberta/i],
    ideal_semantic_categories: ['boardroom', 'enterprise_risk', 'strategic_kpi_cluster']
  },
  production: {
    axis: 'production',
    label: 'Produção',
    generic_patterns: [/capa|auditoria\s*iso/i],
    ideal_semantic_categories: ['line_oee', 'shift_performance', 'downtime_root_cause']
  },
  maintenance: {
    axis: 'maintenance',
    label: 'Manutenção',
    generic_patterns: [/spc|fornecedor\s*ppm/i],
    ideal_semantic_categories: ['work_order_center', 'reliability_score', 'predictive_alerts']
  },
  environment: {
    axis: 'environment',
    label: 'Meio Ambiente / ESG',
    generic_patterns: [/faturamento|lucro/i],
    ideal_semantic_categories: ['emissions_monitor', 'compliance_tracker', 'esg_scorecard']
  },
  logistics: {
    axis: 'logistics',
    label: 'Logística',
    generic_patterns: [/spc|capa/i],
    ideal_semantic_categories: ['fleet_visibility', 'sla_delivery', 'route_efficiency']
  }
});

function resolveDomainAxis(domainOrAxis) {
  const key = String(domainOrAxis || '').toLowerCase().replace(/^coordinator_/, '');
  if (DOMAIN_AXES[key]) return DOMAIN_AXES[key];
  const byPrefix = Object.values(DOMAIN_AXES).find((d) => key.startsWith(d.axis));
  return byPrefix || null;
}

function isDomainOwner(blockDomain, userAxis) {
  const b = String(blockDomain || '').split('.')[0];
  const u = String(userAxis || '').toLowerCase();
  if (b === u) return true;
  if (b === 'safety' && u === 'sst') return true;
  return false;
}

module.exports = {
  DOMAIN_AXES,
  resolveDomainAxis,
  isDomainOwner
};
