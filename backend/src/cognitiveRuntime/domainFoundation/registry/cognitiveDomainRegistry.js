'use strict';

/**
 * Z.24 — Registry canónico de domínios cognitivos.
 * Cada domínio declara blocos, weighting, restrições e density — unificando
 * o que Z.19 (block registry) e domainAuthority (isolation) já fazem mas
 * agora num formato composável pelo runtime multi-domínio.
 */

const COGNITIVE_DOMAINS = Object.freeze({
  quality: {
    domain: 'quality',
    label: 'Qualidade',
    maturity: 'native',
    cognitive_block_prefix: 'quality.',
    weighting: { operational: 0.7, governance: 0.2, strategic: 0.1 },
    operational_focus: { nc: 0.28, capa: 0.22, spc: 0.2, audit: 0.15, supplier: 0.1, narrative: 0.05 },
    governance_rules: {
      isolated_from: ['safety', 'environmental', 'hr', 'executive'],
      denied_pipelines: ['waste_management', 'emissions', 'esg_reporting'],
      governance_tags: ['domain:quality', 'governance:isolated']
    },
    cockpit_density: { max_centers: 6, max_widgets: 8, max_metrics_per_center: 8 },
    semantic_constraints: { keywords: ['qualidade', 'spc', 'capa', 'ncr', 'inspec'], axis: 'quality' },
    pilot_profiles: ['coordinator_quality', 'manager_quality', 'supervisor_quality'],
    cockpit_ready: true
  },

  safety: {
    domain: 'safety',
    label: 'Segurança do Trabalho',
    maturity: 'native',
    cognitive_block_prefix: 'sst.',
    weighting: { operational: 0.65, governance: 0.25, strategic: 0.1 },
    operational_focus: { incidents: 0.3, permits: 0.2, ppe: 0.15, hazard: 0.15, field: 0.1, risk: 0.1 },
    governance_rules: {
      isolated_from: ['quality', 'hr', 'environmental', 'executive'],
      denied_pipelines: ['quality_spc', 'quality_capa', 'esg_reporting'],
      governance_tags: ['domain:safety', 'governance:isolated']
    },
    cockpit_density: { max_centers: 6, max_widgets: 8, max_metrics_per_center: 8 },
    semantic_constraints: { keywords: ['seguranca', 'sst', 'epi', 'acidente', 'nr-'], axis: 'safety' },
    pilot_profiles: ['coordinator_safety', 'supervisor_safety', 'manager_safety', 'safety_technician', 'technician_safety'],
    cockpit_ready: true
  },

  hr: {
    domain: 'hr',
    label: 'Recursos Humanos',
    maturity: 'native',
    cognitive_block_prefix: 'hr.',
    weighting: { operational: 0.7, governance: 0.2, strategic: 0.1 },
    operational_focus: { turnover: 0.2, absenteeism: 0.2, training: 0.2, climate: 0.15, hiring: 0.15, retention: 0.1 },
    governance_rules: {
      isolated_from: ['quality', 'safety', 'production', 'environmental', 'executive'],
      denied_pipelines: ['quality_spc', 'plc_telemetry', 'industrial_telemetry', 'safety_permit_workflow', 'esg_reporting'],
      governance_tags: ['domain:hr', 'governance:isolated', 'people_centric']
    },
    cockpit_density: { max_centers: 6, max_widgets: 8, max_metrics_per_center: 8 },
    semantic_constraints: { keywords: ['rh', 'recursos humanos', 'pessoas', 'dp', 'folha'], axis: 'hr' },
    pilot_profiles: ['coordinator_hr', 'manager_hr', 'supervisor_hr', 'hr_management', 'hr_analyst'],
    cockpit_ready: true
  },

  environmental: {
    domain: 'environmental',
    label: 'Meio Ambiente',
    maturity: 'native',
    cognitive_block_prefix: 'environmental.',
    weighting: { operational: 0.5, governance: 0.35, strategic: 0.15 },
    operational_focus: { emissions: 0.25, waste: 0.25, water: 0.2, compliance: 0.2, esg: 0.1 },
    governance_rules: {
      isolated_from: ['quality', 'hr', 'production'],
      denied_pipelines: ['quality_spc', 'quality_capa', 'people_analytics'],
      governance_tags: ['domain:environmental', 'governance:isolated']
    },
    cockpit_density: { max_centers: 5, max_widgets: 7, max_metrics_per_center: 6 },
    semantic_constraints: { keywords: ['ambiental', 'emissao', 'residuo', 'esg'], axis: 'environmental' },
    pilot_profiles: ['coordinator_environmental', 'manager_environmental', 'supervisor_environmental'],
    cockpit_ready: true
  },

  maintenance: {
    domain: 'maintenance',
    label: 'Manutenção',
    maturity: 'native',
    cognitive_block_prefix: 'maintenance.',
    weighting: { operational: 0.75, governance: 0.2, strategic: 0.05 },
    operational_focus: { reliability: 0.25, predictive: 0.2, mtbf_mttr: 0.2, degradation: 0.15, downtime: 0.1, telemetry: 0.1 },
    governance_rules: {
      isolated_from: ['hr', 'executive'],
      cross_correlation_allowed: ['production', 'quality', 'safety'],
      denied_pipelines: ['people_analytics', 'esg_boardroom', 'quality_capa'],
      governance_tags: ['domain:maintenance', 'governance:isolated', 'reliability_centric']
    },
    cockpit_density: { max_centers: 6, max_widgets: 8, max_metrics_per_center: 8, max_critical_alerts: 3 },
    semantic_constraints: { keywords: ['manutencao', 'mttr', 'mtbf', 'confiabilidade', 'downtime', 'degradacao'], axis: 'maintenance' },
    pilot_profiles: ['coordinator_maintenance', 'manager_maintenance', 'supervisor_maintenance', 'pcm', 'technician_maintenance'],
    cockpit_ready: true
  },

  production: {
    domain: 'production',
    label: 'Produção',
    maturity: 'native',
    cognitive_block_prefix: 'production.',
    weighting: { operational: 0.85, governance: 0.1, strategic: 0.05 },
    operational_focus: { oee: 0.3, efficiency: 0.25, bottleneck: 0.2, waste: 0.15, scheduling: 0.1 },
    governance_rules: {
      isolated_from: ['hr', 'environmental'],
      denied_pipelines: ['people_analytics', 'esg_reporting'],
      governance_tags: ['domain:production']
    },
    cockpit_density: { max_centers: 6, max_widgets: 8, max_metrics_per_center: 10 },
    semantic_constraints: { keywords: ['producao', 'oee', 'eficiencia', 'pcp', 'turno'], axis: 'production' },
    pilot_profiles: ['coordinator_production', 'manager_production', 'supervisor_production', 'analyst_pcp', 'director_industrial'],
    cockpit_ready: true
  },

  executive: {
    domain: 'executive',
    label: 'Executivo',
    maturity: 'native',
    cognitive_block_prefix: 'executive.',
    weighting: { operational: 0.1, governance: 0.2, strategic: 0.7 },
    operational_focus: { enterprise_risk: 0.25, financial: 0.25, sustainability: 0.15, health: 0.2, governance: 0.15 },
    governance_rules: {
      isolated_from: [],
      cross_domain_allowed: true,
      denied_pipelines: ['operational_granular', 'telemetry_raw'],
      governance_tags: ['domain:executive', 'cross_domain:true', 'strategic_centric']
    },
    cockpit_density: { max_centers: 5, max_widgets: 7, max_metrics_per_center: 5 },
    semantic_constraints: { keywords: ['diretor', 'ceo', 'cfo', 'executivo', 'estrategico', 'boardroom'], axis: 'executive' },
    pilot_profiles: ['executive_director', 'ceo', 'cfo', 'director_industrial', 'director_general'],
    cockpit_ready: true
  }
});

function getDomainDefinition(domain) {
  return COGNITIVE_DOMAINS[domain] || null;
}

function listDomains() {
  return Object.keys(COGNITIVE_DOMAINS);
}

function listReadyDomains() {
  return Object.entries(COGNITIVE_DOMAINS)
    .filter(([, d]) => d.cockpit_ready)
    .map(([k]) => k);
}

function getDomainWeighting(domain) {
  return COGNITIVE_DOMAINS[domain]?.weighting || { operational: 0.5, governance: 0.3, strategic: 0.2 };
}

function getDomainDensityLimits(domain) {
  return COGNITIVE_DOMAINS[domain]?.cockpit_density || { max_centers: 6, max_widgets: 8, max_metrics_per_center: 8 };
}

function getDomainIsolationRules(domain) {
  return COGNITIVE_DOMAINS[domain]?.governance_rules || { isolated_from: [], denied_pipelines: [], governance_tags: [] };
}

function isDomainIsolatedFrom(domain, otherDomain) {
  const rules = getDomainIsolationRules(domain);
  if (rules.cross_domain_allowed) return false;
  return (rules.isolated_from || []).includes(otherDomain);
}

module.exports = {
  COGNITIVE_DOMAINS,
  getDomainDefinition,
  listDomains,
  listReadyDomains,
  getDomainWeighting,
  getDomainDensityLimits,
  getDomainIsolationRules,
  isDomainIsolatedFrom
};
