'use strict';

/**
 * Perfis dominiais formais (Fase C.6) — additive ao DASHBOARD_PROFILES legado.
 */

function _base(profileCode, label, modules, cards, sector) {
  return {
    profile_code: profileCode,
    label,
    insights_mode: 'operational_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: modules,
    cards,
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: sector ? { sector } : {}
  };
}

const CORE = ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'settings'];

const DOMAIN_DASHBOARD_PROFILES = Object.freeze({
  coordinator_hr: _base(
    'coordinator_hr',
    'Coordenador de RH',
    [...CORE, 'hr_intelligence'],
    [
      { key: 'department_interactions', title: 'Interações do departamento', icon: 'message', color: 'blue' },
      { key: 'hr_pulse', title: 'Clima e pulse RH', icon: 'brain', color: 'teal', route: '/app/pulse-rh' },
      { key: 'training_pending', title: 'Treinamentos pendentes', icon: 'target', color: 'purple' }
    ],
    'rh'
  ),
  manager_hr: _base(
    'manager_hr',
    'Gerente de RH',
    [...CORE, 'hr_intelligence', 'audit'],
    [
      { key: 'turnover', title: 'Turnover', icon: 'trending', color: 'amber' },
      { key: 'hr_pulse', title: 'Pulse gestão', icon: 'brain', color: 'teal', route: '/app/pulse-gestao' }
    ],
    'rh'
  ),
  supervisor_hr: _base(
    'supervisor_hr',
    'Supervisor de RH',
    [...CORE, 'hr_intelligence'],
    [{ key: 'hr_pulse', title: 'Pulse RH', icon: 'brain', color: 'teal' }],
    'rh'
  ),
  director_hr: _base(
    'director_hr',
    'Diretor de RH',
    [...CORE, 'hr_intelligence', 'audit'],
    [{ key: 'people_strategy', title: 'Estratégia de pessoas', icon: 'trending', color: 'blue' }],
    'rh'
  ),

  coordinator_financial: _base(
    'coordinator_financial',
    'Coordenador Financeiro',
    [...CORE, 'audit'],
    [
      { key: 'budget_variance', title: 'Variação orçamentária', icon: 'trending', color: 'teal' },
      { key: 'cost_center', title: 'Centro de custos', icon: 'target', color: 'blue' }
    ],
    'financeiro'
  ),
  manager_financial: _base(
    'manager_financial',
    'Gerente Financeiro',
    [...CORE, 'audit'],
    [
      { key: 'cashflow', title: 'Fluxo de caixa', icon: 'trending', color: 'green' },
      { key: 'budget_variance', title: 'Orçamento', icon: 'target', color: 'teal' }
    ],
    'financeiro'
  ),
  supervisor_financial: _base(
    'supervisor_financial',
    'Supervisor Financeiro',
    [...CORE],
    [{ key: 'cost_center', title: 'Centro de custos', icon: 'target', color: 'blue' }],
    'financeiro'
  ),
  director_financial: _base(
    'director_financial',
    'Diretor Financeiro',
    [...CORE, 'audit'],
    [{ key: 'financial_overview', title: 'Visão financeira', icon: 'trending', color: 'teal' }],
    'financeiro'
  ),

  coordinator_logistics: _base(
    'coordinator_logistics',
    'Coordenador de Logística',
    [...CORE],
    [
      { key: 'delivery_sla', title: 'SLA de entregas', icon: 'trending', color: 'blue' },
      { key: 'inventory_alert', title: 'Alertas de estoque', icon: 'alert', color: 'amber' }
    ],
    'logistica'
  ),
  manager_logistics: _base(
    'manager_logistics',
    'Gerente de Logística',
    [...CORE, 'audit'],
    [{ key: 'logistics_overview', title: 'Visão logística', icon: 'trending', color: 'teal' }],
    'logistica'
  ),
  supervisor_logistics: _base(
    'supervisor_logistics',
    'Supervisor de Logística',
    [...CORE],
    [{ key: 'expedition_queue', title: 'Fila de expedição', icon: 'target', color: 'blue' }],
    'logistica'
  ),

  coordinator_engineering: _base(
    'coordinator_engineering',
    'Coordenador de Engenharia',
    [...CORE, 'anomaly_detection'],
    [{ key: 'process_kpi', title: 'KPIs de processo', icon: 'trending', color: 'teal' }],
    'engenharia'
  ),
  manager_engineering: _base(
    'manager_engineering',
    'Gerente de Engenharia',
    [...CORE, 'anomaly_detection', 'audit'],
    [{ key: 'engineering_projects', title: 'Projetos de engenharia', icon: 'target', color: 'purple' }],
    'engenharia'
  ),
  supervisor_engineering: _base(
    'supervisor_engineering',
    'Supervisor de Engenharia',
    [...CORE],
    [{ key: 'process_kpi', title: 'Processos', icon: 'activity', color: 'cyan' }],
    'engenharia'
  ),

  coordinator_safety: _base(
    'coordinator_safety',
    'Coordenador de Segurança do Trabalho',
    [...CORE, 'audit'],
    [
      { key: 'safety_incidents', title: 'Incidentes SST', icon: 'alert', color: 'red' },
      { key: 'epi_compliance', title: 'Conformidade EPI', icon: 'target', color: 'amber' }
    ],
    'seguranca'
  ),
  manager_safety: _base(
    'manager_safety',
    'Gerente de Segurança do Trabalho',
    [...CORE, 'audit'],
    [{ key: 'safety_overview', title: 'Visão SST', icon: 'trending', color: 'teal' }],
    'seguranca'
  ),
  supervisor_safety: _base(
    'supervisor_safety',
    'Supervisor de Segurança',
    [...CORE],
    [{ key: 'safety_incidents', title: 'Incidentes', icon: 'alert', color: 'red' }],
    'seguranca'
  ),

  coordinator_compliance: _base(
    'coordinator_compliance',
    'Coordenador de Compliance',
    [...CORE, 'audit'],
    [{ key: 'compliance_status', title: 'Status regulatório', icon: 'alert', color: 'teal' }],
    'compliance'
  ),
  manager_compliance: _base(
    'manager_compliance',
    'Gerente de Compliance',
    [...CORE, 'audit'],
    [{ key: 'compliance_overview', title: 'Governança regulatória', icon: 'trending', color: 'blue' }],
    'compliance'
  ),
  supervisor_compliance: _base(
    'supervisor_compliance',
    'Supervisor de Compliance',
    [...CORE, 'audit'],
    [{ key: 'pending_evidence', title: 'Evidências pendentes', icon: 'target', color: 'amber' }],
    'compliance'
  ),

  coordinator_legal: _base(
    'coordinator_legal',
    'Coordenador Jurídico',
    [...CORE, 'audit'],
    [{ key: 'legal_cases', title: 'Casos jurídicos', icon: 'target', color: 'blue' }],
    'juridico'
  ),
  manager_legal: _base(
    'manager_legal',
    'Gerente Jurídico',
    [...CORE, 'audit'],
    [{ key: 'legal_overview', title: 'Visão jurídica', icon: 'trending', color: 'teal' }],
    'juridico'
  ),
  supervisor_legal: _base(
    'supervisor_legal',
    'Supervisor Jurídico',
    [...CORE, 'audit'],
    [{ key: 'legal_deadlines', title: 'Prazos legais', icon: 'alert', color: 'red' }],
    'juridico'
  ),

  coordinator_operations: _base(
    'coordinator_operations',
    'Coordenador de Operações',
    [...CORE, 'anomaly_detection'],
    [
      { key: 'operational_insights', title: 'Insights operacionais', icon: 'brain', color: 'teal' },
      { key: 'department_interactions', title: 'Interações', icon: 'message', color: 'blue' }
    ],
    'operacoes'
  ),
  manager_operations: _base(
    'manager_operations',
    'Gerente de Operações',
    [...CORE, 'anomaly_detection', 'audit'],
    [{ key: 'operational_overview', title: 'Visão operacional', icon: 'trending', color: 'blue' }],
    'operacoes'
  ),
  supervisor_operations: _base(
    'supervisor_operations',
    'Supervisor de Operações',
    [...CORE, 'anomaly_detection'],
    [{ key: 'shift_overview', title: 'Turno operacional', icon: 'activity', color: 'cyan' }],
    'operacoes'
  )
});

function getDomainProfile(profileCode) {
  return DOMAIN_DASHBOARD_PROFILES[profileCode] || null;
}

function listDomainProfileCodes() {
  return Object.keys(DOMAIN_DASHBOARD_PROFILES);
}

module.exports = {
  DOMAIN_DASHBOARD_PROFILES,
  getDomainProfile,
  listDomainProfileCodes
};
