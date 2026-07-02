'use strict';

/**
 * Registry enterprise de domínios funcionais.
 * Fonte canónica para allowed/denied modules, pipelines, widgets e keywords.
 */

const UNIVERSAL_MODULES = Object.freeze([
  'dashboard',
  'settings',
  'biblioteca',
  'ai',
  'operational',
  'proaction'
]);

const GLOBAL_DENIED = Object.freeze([
  'admin'
]);

/** @type {Record<string, object>} */
const DOMAIN_DEFINITIONS = Object.freeze({
  environmental: {
    axis: 'environmental',
    profiles: [
      'coordinator_environmental',
      'manager_environmental',
      'supervisor_environmental',
      'director_industrial'
    ],
    allowed_modules: [
      ...UNIVERSAL_MODULES,
      'environment_intelligence',
      'audit'
    ],
    denied_modules: [
      'quality_intelligence',
      'raw_material_lots',
      'manuia',
      'anomaly_detection',
      'safety_intelligence'
    ],
    exclusive_modules: [
      'environment_intelligence',
      'emissions',
      'waste_management',
      'environmental_compliance',
      'esg'
    ],
    denied_pipelines: ['quality_spc', 'quality_capa', 'quality_ncr', 'supplier_quality'],
    allowed_pipelines: [
      'environmental_compliance',
      'waste_management',
      'emissions',
      'esg_reporting',
      'utilities_consumption'
    ],
    dashboards: ['environmental_management', 'environmental_operational'],
    widgets: ['environmental_compliance', 'emissions_indicator', 'waste_management', 'water_consumption', 'esg_score'],
    ai_contexts: ['environmental', 'sustainability', 'esg', 'utilities'],
    semantic_keywords: [
      'meio ambiente',
      'ambiental',
      'emissao',
      'residuo',
      'efluente',
      'eta',
      'ete',
      'esg',
      'carbono'
    ],
    departments: ['meio ambiente', 'ambiental', 'sustentabilidade'],
    structural_roles: ['coordenador ambiental', 'gerente ambiental'],
    tenant_overrides_supported: true
  },

  sustainability: {
    axis: 'sustainability',
    profiles: ['coordinator_environmental', 'manager_environmental', 'supervisor_environmental'],
    allowed_modules: [...UNIVERSAL_MODULES, 'environment_intelligence'],
    denied_modules: ['quality_intelligence', 'raw_material_lots', 'manuia'],
    denied_pipelines: ['quality_spc', 'quality_capa', 'quality_ncr'],
    allowed_pipelines: ['esg_reporting', 'sustainability_kpi'],
    dashboards: ['sustainability_management'],
    widgets: ['esg_score', 'emissions_indicator'],
    ai_contexts: ['sustainability', 'esg'],
    semantic_keywords: ['sustentabilidade', 'esg', 'asg', 'neutralidade carbono'],
    departments: ['sustentabilidade'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  quality: {
    axis: 'quality',
    profiles: [
      'coordinator_quality',
      'manager_quality',
      'supervisor_quality',
      'inspector_quality',
      'director_industrial'
    ],
    allowed_modules: [...UNIVERSAL_MODULES, 'quality_intelligence', 'raw_material_lots', 'audit'],
    denied_modules: ['environment_intelligence'],
    denied_pipelines: ['waste_management', 'emissions', 'esg_reporting', 'environmental_governance'],
    allowed_pipelines: ['quality_spc', 'quality_capa', 'quality_ncr', 'supplier_quality', 'inspection'],
    dashboards: ['quality_operational', 'quality_governance'],
    widgets: ['open_nc', 'quality_dashboard', 'pending_inspections', 'spc'],
    ai_contexts: ['quality', 'inspection', 'laboratory'],
    semantic_keywords: ['qualidade', 'nao conform', 'inspec', 'spc', 'capa', 'ncr'],
    departments: ['qualidade', 'qc', 'qa'],
    structural_roles: ['coordenador de qualidade', 'gerente de qualidade'],
    tenant_overrides_supported: true
  },

  hr: {
    axis: 'hr',
    profiles: [
      'coordinator_hr',
      'manager_hr',
      'supervisor_hr',
      'hr_management',
      'director_hr'
    ],
    allowed_modules: [...UNIVERSAL_MODULES, 'hr_intelligence'],
    denied_modules: ['manuia', 'quality_intelligence', 'environment_intelligence', 'anomaly_detection'],
    denied_pipelines: ['plc_telemetry', 'industrial_telemetry', 'maintenance_os', 'quality_spc'],
    allowed_pipelines: ['people_analytics', 'payroll', 'training', 'absenteeism'],
    dashboards: ['hr_management', 'people_operations'],
    widgets: ['pulse_rh', 'turnover', 'training_compliance'],
    ai_contexts: ['hr', 'people', 'payroll'],
    semantic_keywords: ['rh', 'recursos humanos', 'pessoas', 'dp', 'folha'],
    departments: ['recursos humanos', 'rh', 'departamento pessoal'],
    structural_roles: ['coordenador de recursos humanos', 'gerente de rh'],
    tenant_overrides_supported: true
  },

  finance: {
    axis: 'finance',
    profiles: [
      'coordinator_financial',
      'manager_financial',
      'supervisor_financial',
      'finance_management',
      'director_financial'
    ],
    allowed_modules: [...UNIVERSAL_MODULES, 'audit', 'anomaly_detection'],
    denied_modules: [
      'manuia',
      'quality_intelligence',
      'environment_intelligence',
      'raw_material_lots'
    ],
    denied_pipelines: ['industrial_telemetry', 'plc_telemetry', 'opcua', 'mqtt_sensors', 'quality_spc'],
    allowed_pipelines: ['financial_intelligence', 'cost_center', 'budget', 'cashflow'],
    dashboards: ['finance_management', 'financial_control'],
    widgets: ['cost_center', 'budget_variance', 'cashflow'],
    ai_contexts: ['finance', 'cost', 'budget'],
    semantic_keywords: ['financeiro', 'financas', 'cfo', 'controladoria', 'contabil'],
    departments: ['financeiro', 'controladoria', 'tesouraria'],
    structural_roles: ['diretor financeiro', 'cfo'],
    tenant_overrides_supported: true
  },

  logistics: {
    axis: 'logistics',
    profiles: ['coordinator_logistics', 'manager_logistics', 'supervisor_logistics', 'director_operations'],
    allowed_modules: [...UNIVERSAL_MODULES, 'audit'],
    denied_modules: ['quality_intelligence', 'hr_intelligence', 'environment_intelligence'],
    denied_pipelines: ['quality_spc', 'quality_capa'],
    allowed_pipelines: ['logistics_tms', 'wms', 'expedition'],
    dashboards: ['logistics_operations'],
    widgets: ['delivery_sla', 'inventory_turnover'],
    ai_contexts: ['logistics', 'supply', 'inventory'],
    semantic_keywords: ['logistica', 'expedicao', 'almoxarifado', 'wms', 'tms'],
    departments: ['logistica', 'suprimentos', 'almoxarifado'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  procurement: {
    axis: 'procurement',
    profiles: ['coordinator_logistics', 'manager_logistics'],
    allowed_modules: [...UNIVERSAL_MODULES],
    denied_modules: ['quality_intelligence', 'environment_intelligence', 'manuia'],
    denied_pipelines: ['quality_spc', 'plc_telemetry'],
    allowed_pipelines: ['procurement', 'supplier_management'],
    dashboards: ['procurement'],
    widgets: [],
    ai_contexts: ['procurement', 'compras'],
    semantic_keywords: ['compras', 'suprimentos'],
    departments: ['compras'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  safety: {
    axis: 'safety',
    profiles: [
      'coordinator_safety',
      'manager_safety',
      'supervisor_safety',
      'director_safety'
    ],
    allowed_modules: [...UNIVERSAL_MODULES, 'safety_intelligence', 'audit'],
    inherited_modules: ['telemetry_core'],
    shared_modules: ['operational', 'proaction', 'biblioteca', 'ai'],
    exclusive_modules: [
      'safety_intelligence',
      'incident_management',
      'epi_management',
      'permit_to_work',
      'risk_matrix',
      'behavioral_safety',
      'safety_compliance',
      'nr_governance',
      'critical_alerts',
      'occupational_health'
    ],
    denied_modules: [
      'quality_intelligence',
      'raw_material_lots',
      'environment_intelligence',
      'manuia',
      'anomaly_detection'
    ],
    denied_pipelines: [
      'quality_spc',
      'quality_capa',
      'esg_reporting',
      'emissions',
      'waste_management',
      'environmental_governance',
      'carbon_inventory',
      'gee_corporate',
      'ete_management'
    ],
    allowed_pipelines: [
      'sst',
      'incident_safety',
      'epi',
      'permit_to_work',
      'risk_matrix',
      'safety_compliance',
      'critical_alerts',
      'telemetry_critical'
    ],
    dashboards: ['safety_management', 'safety_operational'],
    widgets: ['incidents_safety', 'epi_compliance', 'safety_incidents', 'critical_alerts'],
    ai_contexts: ['safety', 'sst', 'sso', 'occupational_health'],
    semantic_keywords: ['seguranca do trabalho', 'sst', 'sso', 'epi', 'acidente de trabalho', 'nr-'],
    departments: ['seguranca', 'sst', 'seguranca do trabalho'],
    structural_roles: ['tecnico de seguranca', 'coordenador de seguranca'],
    tenant_overrides_supported: true,
    inherits_environmental: false
  },

  ehs_shared: {
    axis: 'ehs_shared',
    profiles: ['coordinator_safety', 'manager_safety'],
    allowed_modules: [...UNIVERSAL_MODULES, 'audit'],
    shared_modules: ['operational', 'proaction'],
    exclusive_modules: [],
    denied_modules: ['environment_intelligence', 'quality_intelligence', 'esg_corporate'],
    denied_pipelines: ['esg_reporting', 'emissions', 'quality_spc'],
    allowed_pipelines: ['ehs', 'sst', 'occupational_health'],
    dashboards: ['ehs_operational'],
    widgets: [],
    ai_contexts: ['ehs', 'safety'],
    semantic_keywords: ['ehs', 'hsse'],
    departments: [],
    structural_roles: [],
    tenant_overrides_supported: true,
    inherits_environmental: false
  },

  engineering: {
    axis: 'engineering',
    profiles: ['coordinator_engineering', 'manager_engineering', 'supervisor_engineering', 'director_industrial'],
    allowed_modules: [...UNIVERSAL_MODULES, 'anomaly_detection'],
    denied_modules: ['hr_intelligence', 'quality_intelligence'],
    denied_pipelines: ['payroll', 'people_analytics'],
    allowed_pipelines: ['process_engineering', 'industrial_projects'],
    dashboards: ['engineering'],
    widgets: ['process_kpi'],
    ai_contexts: ['engineering', 'process'],
    semantic_keywords: ['engenharia', 'processos', 'projeto'],
    departments: ['engenharia'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  production: {
    axis: 'production',
    profiles: [
      'coordinator_production',
      'manager_production',
      'supervisor_production',
      'operator_floor',
      'director_industrial'
    ],
    allowed_modules: [...UNIVERSAL_MODULES, 'anomaly_detection', 'quality_intelligence'],
    denied_modules: ['hr_intelligence', 'environment_intelligence'],
    denied_pipelines: ['payroll', 'esg_reporting'],
    allowed_pipelines: ['oee', 'production_shift'],
    dashboards: ['production_operations'],
    widgets: ['production_shift', 'oee'],
    ai_contexts: ['production', 'operations'],
    semantic_keywords: ['producao', 'linha', 'turno', 'oee'],
    departments: ['producao'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  maintenance: {
    axis: 'maintenance',
    profiles: [
      'coordinator_maintenance',
      'manager_maintenance',
      'supervisor_maintenance',
      'technician_maintenance',
      'director_industrial'
    ],
    allowed_modules: [...UNIVERSAL_MODULES, 'manuia', 'anomaly_detection'],
    denied_modules: ['hr_intelligence', 'environment_intelligence'],
    denied_pipelines: ['payroll', 'esg_reporting'],
    allowed_pipelines: ['maintenance_os', 'preventive', 'tpm'],
    dashboards: ['maintenance'],
    widgets: ['open_work_orders'],
    ai_contexts: ['maintenance', 'pcm'],
    semantic_keywords: ['manutencao', 'pcm', 'os', 'mttr'],
    departments: ['manutencao', 'pcm'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  operations: {
    axis: 'operations',
    profiles: [
      'coordinator_operations',
      'manager_operations',
      'supervisor_operations',
      'director_operations'
    ],
    allowed_modules: [...UNIVERSAL_MODULES, 'anomaly_detection', 'audit'],
    denied_modules: [],
    denied_pipelines: [],
    allowed_pipelines: ['operational_command'],
    dashboards: ['operations_command'],
    widgets: ['operational_insights'],
    ai_contexts: ['operations'],
    semantic_keywords: ['operacoes', 'operacional'],
    departments: ['operacoes'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  pcp: {
    axis: 'pcp',
    profiles: ['analyst_pcp', 'coordinator_operations', 'manager_production'],
    allowed_modules: [...UNIVERSAL_MODULES],
    denied_modules: ['hr_intelligence', 'environment_intelligence'],
    denied_pipelines: ['payroll'],
    allowed_pipelines: ['mrp', 'scheduling'],
    dashboards: ['pcp'],
    widgets: ['scheduling'],
    ai_contexts: ['pcp', 'planning'],
    semantic_keywords: ['pcp', 'planejamento', 'mrp'],
    departments: ['pcp', 'planejamento'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  compliance: {
    axis: 'compliance',
    profiles: ['coordinator_compliance', 'manager_compliance', 'supervisor_compliance', 'director_operations'],
    allowed_modules: [...UNIVERSAL_MODULES, 'audit'],
    denied_modules: ['manuia', 'anomaly_detection'],
    denied_pipelines: ['plc_telemetry', 'production_shift'],
    allowed_pipelines: ['compliance_audit', 'regulatory'],
    dashboards: ['compliance'],
    widgets: ['compliance_status'],
    ai_contexts: ['compliance', 'regulatory'],
    semantic_keywords: ['compliance', 'conformidade', 'regulatorio'],
    departments: ['compliance'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  legal: {
    axis: 'legal',
    profiles: ['coordinator_legal', 'manager_legal', 'supervisor_legal', 'director_operations'],
    allowed_modules: [...UNIVERSAL_MODULES, 'audit'],
    denied_modules: ['manuia', 'quality_intelligence', 'anomaly_detection'],
    denied_pipelines: ['plc_telemetry', 'quality_spc'],
    allowed_pipelines: ['legal_cases'],
    dashboards: ['legal'],
    widgets: [],
    ai_contexts: ['legal', 'juridico'],
    semantic_keywords: ['juridico', 'legal'],
    departments: ['juridico'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  governance: {
    axis: 'governance',
    profiles: ['director_unassigned', 'ceo_executive', 'admin_system'],
    allowed_modules: [...UNIVERSAL_MODULES, 'audit'],
    denied_modules: [],
    denied_pipelines: [],
    allowed_pipelines: ['governance'],
    dashboards: ['governance'],
    widgets: [],
    ai_contexts: ['governance', 'executive'],
    semantic_keywords: ['governanca', 'diretoria'],
    departments: [],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  executive: {
    axis: 'executive',
    profiles: ['ceo_executive', 'director_unassigned', 'director_operations', 'director_industrial'],
    allowed_modules: [...UNIVERSAL_MODULES, 'audit', 'anomaly_detection', 'hr_intelligence', 'biblioteca'],
    denied_modules: [
      'proaction',
      'manuia',
      'quality_intelligence',
      'safety_intelligence',
      'environment_intelligence',
      'logistics_intelligence',
      'raw_material_lots',
      'financial_intelligence'
    ],
    denied_pipelines: [],
    allowed_pipelines: ['executive_summary'],
    dashboards: ['executive'],
    widgets: ['smart_summary'],
    ai_contexts: ['executive'],
    semantic_keywords: ['diretoria', 'executivo', 'ceo'],
    departments: [],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  admin: {
    axis: 'admin',
    profiles: ['admin_system'],
    allowed_modules: [...UNIVERSAL_MODULES, 'admin', 'audit'],
    denied_modules: [],
    denied_pipelines: [],
    allowed_pipelines: ['admin'],
    dashboards: ['admin'],
    widgets: [],
    ai_contexts: ['admin'],
    semantic_keywords: ['admin', 'ti', 'sistemas'],
    departments: ['ti', 'administrativo'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  utilities: {
    axis: 'utilities',
    profiles: ['coordinator_environmental', 'manager_environmental', 'supervisor_environmental'],
    allowed_modules: [...UNIVERSAL_MODULES, 'environment_intelligence'],
    denied_modules: ['quality_intelligence'],
    denied_pipelines: ['quality_spc', 'quality_capa'],
    allowed_pipelines: ['utilities_consumption', 'energy', 'water'],
    dashboards: ['utilities'],
    widgets: ['utilities_consumption'],
    ai_contexts: ['utilities'],
    semantic_keywords: ['utilidades', 'vapor', 'energia'],
    departments: ['utilidades'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  laboratory: {
    axis: 'laboratory',
    profiles: ['coordinator_quality', 'inspector_quality'],
    allowed_modules: [...UNIVERSAL_MODULES, 'quality_intelligence'],
    denied_modules: ['environment_intelligence', 'manuia'],
    denied_pipelines: ['esg_reporting'],
    allowed_pipelines: ['lab_analysis'],
    dashboards: ['laboratory'],
    widgets: [],
    ai_contexts: ['laboratory'],
    semantic_keywords: ['laboratorio', 'laudo'],
    departments: ['laboratorio'],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  esg: {
    axis: 'esg',
    profiles: ['coordinator_environmental', 'manager_environmental'],
    allowed_modules: [...UNIVERSAL_MODULES, 'environment_intelligence', 'audit'],
    denied_modules: ['quality_intelligence', 'manuia'],
    denied_pipelines: ['quality_spc', 'quality_capa'],
    allowed_pipelines: ['esg_reporting'],
    dashboards: ['esg'],
    widgets: ['esg_score'],
    ai_contexts: ['esg'],
    semantic_keywords: ['esg', 'asg'],
    departments: [],
    structural_roles: [],
    tenant_overrides_supported: true
  },

  environmental_health_safety: {
    axis: 'environmental_health_safety',
    profiles: ['coordinator_safety', 'manager_safety', 'supervisor_safety'],
    allowed_modules: [...UNIVERSAL_MODULES, 'safety_intelligence', 'audit'],
    shared_modules: ['operational', 'proaction'],
    denied_modules: ['environment_intelligence', 'quality_intelligence'],
    denied_pipelines: ['esg_reporting', 'emissions', 'carbon_inventory', 'quality_spc'],
    allowed_pipelines: ['ehs', 'sst', 'incident_safety', 'epi'],
    dashboards: ['ehs_operational', 'safety_management'],
    widgets: ['safety_incidents', 'epi_compliance'],
    ai_contexts: ['ehs', 'safety'],
    semantic_keywords: ['ehs', 'hsse'],
    departments: [],
    structural_roles: [],
    tenant_overrides_supported: true,
    inherits_environmental: false
  },

  industrial: {
    axis: 'industrial',
    profiles: ['director_industrial', 'manager_production', 'coordinator_production'],
    allowed_modules: [...UNIVERSAL_MODULES, 'anomaly_detection', 'manuia'],
    denied_modules: ['hr_intelligence'],
    denied_pipelines: ['payroll'],
    allowed_pipelines: ['industrial_command'],
    dashboards: ['industrial'],
    widgets: [],
    ai_contexts: ['industrial'],
    semantic_keywords: ['industrial'],
    departments: ['industrial'],
    structural_roles: [],
    tenant_overrides_supported: true
  }
});

const AXIS_ALIASES = Object.freeze({
  meio_ambiente: 'environmental',
  ambiental: 'environmental',
  qualidade: 'quality',
  rh: 'hr',
  recursos_humanos: 'hr',
  financeiro: 'finance',
  financas: 'finance',
  logistica: 'logistics',
  seguranca: 'safety',
  engenharia: 'engineering',
  producao: 'production',
  manutencao: 'maintenance',
  operacoes: 'operations',
  juridico: 'legal',
  compras: 'procurement'
});

function normalizeAxis(axis) {
  const k = String(axis || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (DOMAIN_DEFINITIONS[k]) return k;
  if (AXIS_ALIASES[k]) return AXIS_ALIASES[k];
  return k || 'operations';
}

function getDomain(axis) {
  const key = normalizeAxis(axis);
  return DOMAIN_DEFINITIONS[key] || DOMAIN_DEFINITIONS.operations;
}

function listDomains() {
  return Object.keys(DOMAIN_DEFINITIONS);
}

function getIsolationMatrix() {
  return Object.entries(DOMAIN_DEFINITIONS).map(([axis, def]) => ({
    axis,
    allowed: [...(def.allowed_modules || []), ...(def.allowed_pipelines || [])],
    denied: [...(def.denied_modules || []), ...(def.denied_pipelines || [])]
  }));
}

module.exports = {
  DOMAIN_DEFINITIONS,
  GLOBAL_DENIED,
  UNIVERSAL_MODULES,
  normalizeAxis,
  getDomain,
  listDomains,
  getIsolationMatrix
};
