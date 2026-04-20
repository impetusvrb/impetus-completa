/**
 * MATRIZ DE PERFIS DE DASHBOARD INTELIGENTE
 * Combina role + functional_area para definir cards, gráficos, alertas e KPIs
 * DASHBOARD = HIERARQUIA + ÁREA + CARGO + PERMISSÕES + PREFERÊNCIAS + HISTÓRICO
 */

const DASHBOARD_PROFILES = {
  // === EXECUTIVO ===
  ceo_executive: {
    profile_code: 'ceo_executive',
    label: 'CEO / Executivo',
    insights_mode: 'strategic_executive',
    default_period: '7d',
    data_depth: 'consolidated',
    visible_modules: ['dashboard', 'operational', 'proaction', 'chat', 'biblioteca', 'ai', 'hr_intelligence', 'anomaly_detection', 'settings'],
    cards: [
      { key: 'interactions_week', title: 'Interações (semana)', icon: 'message', color: 'blue', route: '/app/operacional' },
      { key: 'critical_alerts', title: 'Alertas críticos', icon: 'alert', color: 'red', route: '/app/chatbot' },
      { key: 'operational_anomalies', title: 'Anomalias operacionais', icon: 'alert', color: 'orange', route: '/app/anomalies' },
      { key: 'weekly_growth', title: 'Crescimento semanal', icon: 'trending', color: 'green' },
      { key: 'open_proposals', title: 'Propostas em aberto', icon: 'target', color: 'purple', route: '/app/proacao' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['smart_summary', 'ai_insights', 'recent_interactions', 'executive_query'],
    default_filters: {}
  },

  // === DIRETORIA ===
  director_operations: {
    profile_code: 'director_operations',
    label: 'Diretor de Operações',
    insights_mode: 'strategic_analytical',
    default_period: '7d',
    data_depth: 'consolidated',
    visible_modules: ['dashboard', 'operational', 'proaction', 'chat', 'biblioteca', 'ai', 'hr_intelligence', 'anomaly_detection', 'audit', 'settings'],
    cards: [
      { key: 'interactions_week', title: 'Interações (semana)', icon: 'message', color: 'blue' },
      { key: 'critical_alerts', title: 'Alertas críticos', icon: 'alert', color: 'red' },
      { key: 'weekly_growth', title: 'Crescimento semanal', icon: 'trending', color: 'green' },
      { key: 'open_proposals', title: 'Propostas em aberto', icon: 'target', color: 'purple' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['smart_summary', 'ai_insights', 'recent_interactions', 'communication_panel'],
    default_filters: {}
  },

  director_industrial: {
    profile_code: 'director_industrial',
    label: 'Diretor Industrial',
    insights_mode: 'strategic_analytical',
    default_period: '7d',
    data_depth: 'consolidated',
    visible_modules: ['dashboard', 'operational', 'proaction', 'chat', 'biblioteca', 'ai', 'hr_intelligence', 'anomaly_detection', 'audit', 'settings'],
    cards: [
      { key: 'production_consolidated', title: 'Produção consolidada', icon: 'trending', color: 'blue' },
      { key: 'global_efficiency', title: 'Eficiência global', icon: 'target', color: 'green' },
      { key: 'critical_stops', title: 'Paradas críticas', icon: 'alert', color: 'red' },
      { key: 'strategic_actions', title: 'Ações estratégicas vencidas', icon: 'target', color: 'orange' },
      { key: 'sectors_alert', title: 'Setores em alerta', icon: 'alert', color: 'purple' }
    ],
    charts: ['trend', 'sector_comparison'],
    alerts: ['critical', 'high'],
    widgets: ['smart_summary', 'ai_insights', 'kpi_request', 'communication_panel'],
    default_filters: {}
  },

  // === GERÊNCIA ===
  manager_production: {
    profile_code: 'manager_production',
    label: 'Gerente de Produção',
    insights_mode: 'analytical_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'anomaly_detection', 'audit', 'settings'],
    cards: [
      { key: 'production_shift', title: 'Produção do turno', icon: 'trending', color: 'blue' },
      { key: 'meta_realizado', title: 'Meta x Realizado', icon: 'target', color: 'green' },
      { key: 'line_efficiency', title: 'Eficiência da linha', icon: 'activity', color: 'teal' },
      { key: 'losses', title: 'Perdas', icon: 'alert', color: 'orange' },
      { key: 'bottlenecks', title: 'Gargalos', icon: 'alert', color: 'red' }
    ],
    charts: ['trend', 'production_by_line'],
    alerts: ['critical', 'high', 'medium'],
    widgets: ['smart_summary', 'ai_insights', 'kpi_request', 'plc_alerts'],
    default_filters: { sector: 'producao' }
  },

  manager_maintenance: {
    profile_code: 'manager_maintenance',
    label: 'Gerente de Manutenção',
    insights_mode: 'analytical_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'anomaly_detection', 'audit', 'manuia', 'settings'],
    cards: [
      { key: 'open_work_orders', title: 'OS abertas', icon: 'target', color: 'blue' },
      { key: 'critical_assets', title: 'Ativos críticos', icon: 'alert', color: 'red' },
      { key: 'mttr', title: 'Tempo médio de reparo', icon: 'activity', color: 'orange' },
      { key: 'preventive_overdue', title: 'Preventivas vencidas', icon: 'alert', color: 'red' },
      { key: 'asset_availability', title: 'Disponibilidade dos ativos', icon: 'trending', color: 'green' }
    ],
    charts: ['trend', 'maintenance_by_asset'],
    alerts: ['critical', 'high', 'medium'],
    widgets: ['smart_summary', 'ai_insights', 'kpi_request', 'plc_alerts'],
    default_filters: { sector: 'manutencao' }
  },

  manager_quality: {
    profile_code: 'manager_quality',
    label: 'Gerente de Qualidade',
    insights_mode: 'analytical_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'raw_material_lots', 'quality_intelligence', 'audit', 'settings'],
    cards: [
      { key: 'open_nc', title: 'Não conformidades abertas', icon: 'alert', color: 'red' },
      { key: 'lot_alerts', title: 'Alertas de lotes', icon: 'alert', color: 'orange', route: '/app/raw-material-lots' },
      { key: 'quality_dashboard', title: 'Painel de Qualidade', icon: 'trending', color: 'teal', route: '/app/quality' },
      { key: 'corrective_overdue', title: 'Ações corretivas vencidas', icon: 'alert', color: 'orange' },
      { key: 'pending_audits', title: 'Auditorias pendentes', icon: 'target', color: 'blue' },
      { key: 'deviation_recurrence', title: 'Reincidência de desvios', icon: 'alert', color: 'red' },
      { key: 'sector_conformity', title: 'Conformidade por setor', icon: 'trending', color: 'green' }
    ],
    charts: ['trend', 'quality_by_sector'],
    alerts: ['critical', 'high', 'medium'],
    widgets: ['smart_summary', 'ai_insights', 'kpi_request'],
    default_filters: { sector: 'qualidade' }
  },

  // === COORDENAÇÃO ===
  coordinator_production: {
    profile_code: 'coordinator_production',
    label: 'Coordenador de Produção',
    insights_mode: 'operational_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'anomaly_detection', 'settings'],
    cards: [
      { key: 'department_interactions', title: 'Interações do departamento', icon: 'message', color: 'blue' },
      { key: 'proposals_in_progress', title: 'Propostas em andamento', icon: 'target', color: 'purple' },
      { key: 'operational_insights', title: 'Insights operacionais', icon: 'brain', color: 'teal' },
      { key: 'production_shift', title: 'Produção do turno', icon: 'trending', color: 'blue' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions', 'plc_alerts'],
    default_filters: {}
  },

  coordinator_maintenance: {
    profile_code: 'coordinator_maintenance',
    label: 'Coordenador de Manutenção',
    insights_mode: 'operational_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'anomaly_detection', 'manuia', 'settings'],
    cards: [
      { key: 'open_work_orders', title: 'OS abertas', icon: 'target', color: 'blue' },
      { key: 'operational_insights', title: 'Insights operacionais', icon: 'brain', color: 'teal' },
      { key: 'recurring_failures', title: 'Falhas recorrentes', icon: 'alert', color: 'orange' },
      { key: 'department_interactions', title: 'Interações do departamento', icon: 'message', color: 'blue' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions', 'plc_alerts'],
    default_filters: {}
  },

  coordinator_quality: {
    profile_code: 'coordinator_quality',
    label: 'Coordenador de Qualidade',
    insights_mode: 'operational_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'quality_intelligence', 'settings'],
    cards: [
      { key: 'open_nc', title: 'Não conformidades abertas', icon: 'alert', color: 'red' },
      { key: 'quality_dashboard', title: 'Painel de Qualidade', icon: 'trending', color: 'teal', route: '/app/quality' },
      { key: 'operational_insights', title: 'Insights operacionais', icon: 'brain', color: 'teal' },
      { key: 'department_interactions', title: 'Interações do departamento', icon: 'message', color: 'blue' },
      { key: 'pending_inspections', title: 'Inspeções pendentes', icon: 'target', color: 'blue' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: {}
  },

  // === SUPERVISÃO ===
  supervisor_production: {
    profile_code: 'supervisor_production',
    label: 'Supervisor de Produção',
    insights_mode: 'technical_tactical',
    default_period: '7d',
    data_depth: 'operational',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'anomaly_detection', 'settings'],
    cards: [
      { key: 'production_shift', title: 'Produção do turno', icon: 'trending', color: 'blue' },
      { key: 'meta_realizado', title: 'Meta x Realizado', icon: 'target', color: 'green' },
      { key: 'line_efficiency', title: 'Eficiência da linha', icon: 'activity', color: 'teal' },
      { key: 'losses', title: 'Perdas', icon: 'alert', color: 'orange' },
      { key: 'stops', title: 'Paradas', icon: 'alert', color: 'red' },
      { key: 'team_shift', title: 'Equipe do turno', icon: 'users', color: 'blue' },
      { key: 'pending_actions', title: 'Ações pendentes', icon: 'target', color: 'purple' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high', 'medium'],
    widgets: ['ai_insights', 'recent_interactions', 'plc_alerts'],
    default_filters: {}
  },

  supervisor_maintenance: {
    profile_code: 'supervisor_maintenance',
    label: 'Supervisor de Manutenção',
    insights_mode: 'technical_tactical',
    default_period: '7d',
    data_depth: 'operational',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'anomaly_detection', 'manuia', 'settings'],
    cards: [
      { key: 'open_work_orders', title: 'OS abertas', icon: 'target', color: 'blue' },
      { key: 'critical_assets', title: 'Ativos críticos', icon: 'alert', color: 'red' },
      { key: 'recurring_failures', title: 'Falhas recorrentes', icon: 'alert', color: 'orange' },
      { key: 'mttr', title: 'Tempo médio de reparo', icon: 'activity', color: 'orange' },
      { key: 'preventive_overdue', title: 'Preventivas vencidas', icon: 'alert', color: 'red' },
      { key: 'asset_availability', title: 'Disponibilidade dos ativos', icon: 'trending', color: 'green' },
      { key: 'machines_stopped', title: 'Máquinas paradas', icon: 'alert', color: 'red' },
      { key: 'technical_urgencies', title: 'Urgências técnicas', icon: 'alert', color: 'red' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high', 'medium'],
    widgets: ['ai_insights', 'recent_interactions', 'plc_alerts'],
    default_filters: {}
  },

  supervisor_quality: {
    profile_code: 'supervisor_quality',
    label: 'Supervisor de Qualidade',
    insights_mode: 'technical_tactical',
    default_period: '7d',
    data_depth: 'operational',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'quality_intelligence', 'settings'],
    cards: [
      { key: 'open_nc', title: 'Não conformidades abertas', icon: 'alert', color: 'red' },
      { key: 'quality_dashboard', title: 'Painel de Qualidade', icon: 'trending', color: 'teal', route: '/app/quality' },
      { key: 'corrective_overdue', title: 'Ações corretivas vencidas', icon: 'alert', color: 'orange' },
      { key: 'pending_audits', title: 'Auditorias pendentes', icon: 'target', color: 'blue' },
      { key: 'deviation_recurrence', title: 'Reincidência de desvios', icon: 'alert', color: 'red' },
      { key: 'sector_conformity', title: 'Conformidade por setor', icon: 'trending', color: 'green' },
      { key: 'pop_adherence', title: 'Aderência a POP', icon: 'target', color: 'teal' },
      { key: 'pending_inspections', title: 'Inspeções pendentes', icon: 'target', color: 'blue' },
      { key: 'critical_deviations', title: 'Desvios críticos', icon: 'alert', color: 'red' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high', 'medium'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: {}
  },

  // === ESPECIALISTAS ===
  analyst_pcp: {
    profile_code: 'analyst_pcp',
    label: 'Analista de PCP',
    insights_mode: 'operational_analytical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'settings'],
    cards: [
      { key: 'production_planning', title: 'Planejamento de produção', icon: 'target', color: 'blue' },
      { key: 'department_interactions', title: 'Interações do departamento', icon: 'message', color: 'blue' },
      { key: 'operational_insights', title: 'Insights operacionais', icon: 'brain', color: 'teal' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: {}
  },

  technician_maintenance: {
    profile_code: 'technician_maintenance',
    label: 'Técnico de Manutenção',
    insights_mode: 'practical_operational',
    default_period: '7d',
    data_depth: 'operational',
    visible_modules: ['dashboard', 'operational', 'chat', 'biblioteca', 'ai', 'manuia', 'settings'],
    cards: [
      { key: 'my_work_orders', title: 'Minhas OS', icon: 'target', color: 'blue' },
      { key: 'operational_alerts', title: 'Alertas operacionais', icon: 'alert', color: 'orange' },
      { key: 'my_interactions', title: 'Minhas interações', icon: 'message', color: 'blue' }
    ],
    charts: [],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: {}
  },

  inspector_quality: {
    profile_code: 'inspector_quality',
    label: 'Inspetor de Qualidade',
    insights_mode: 'practical_operational',
    default_period: '7d',
    data_depth: 'operational',
    visible_modules: ['dashboard', 'operational', 'chat', 'biblioteca', 'ai', 'quality_intelligence', 'settings'],
    cards: [
      { key: 'pending_inspections', title: 'Inspeções pendentes', icon: 'target', color: 'blue' },
      { key: 'quality_dashboard', title: 'Painel de Qualidade', icon: 'trending', color: 'teal', route: '/app/quality' },
      { key: 'operational_alerts', title: 'Alertas operacionais', icon: 'alert', color: 'orange' },
      { key: 'my_interactions', title: 'Minhas interações', icon: 'message', color: 'blue' }
    ],
    charts: [],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: {}
  },

  operator_floor: {
    profile_code: 'operator_floor',
    label: 'Operador',
    insights_mode: 'objective_practical',
    default_period: '7d',
    data_depth: 'operational',
    visible_modules: ['dashboard', 'operational', 'chat', 'biblioteca', 'ai', 'settings'],
    cards: [
      { key: 'my_interactions', title: 'Minhas interações', icon: 'message', color: 'blue' },
      { key: 'my_proposals', title: 'Minhas propostas', icon: 'target', color: 'purple' }
    ],
    charts: [],
    alerts: ['critical'],
    widgets: ['ai_insights'],
    default_filters: {}
  },

  // === ADMINISTRATIVO ===
  hr_management: {
    profile_code: 'hr_management',
    label: 'RH',
    insights_mode: 'analytical_tactical',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'biblioteca', 'ai', 'hr_intelligence', 'settings'],
    cards: [
      { key: 'team_indicators', title: 'Indicadores da equipe', icon: 'users', color: 'blue', route: '/app/hr-intelligence' },
      { key: 'hr_alerts', title: 'Alertas de RH', icon: 'alert', color: 'orange', route: '/app/hr-intelligence' },
      { key: 'department_interactions', title: 'Interações do departamento', icon: 'message', color: 'blue' },
      { key: 'operational_insights', title: 'Insights operacionais', icon: 'brain', color: 'teal' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: {}
  },

  finance_management: {
    profile_code: 'finance_management',
    label: 'Financeiro',
    insights_mode: 'analytical_strategic',
    default_period: '7d',
    data_depth: 'detailed',
    visible_modules: ['dashboard', 'operational', 'biblioteca', 'ai', 'settings'],
    cards: [
      { key: 'financial_indicators', title: 'Indicadores financeiros', icon: 'trending', color: 'blue' },
      { key: 'department_interactions', title: 'Interações do departamento', icon: 'message', color: 'blue' },
      { key: 'operational_insights', title: 'Insights operacionais', icon: 'brain', color: 'teal' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high'],
    widgets: ['ai_insights', 'recent_interactions'],
    default_filters: {}
  },

  admin_system: {
    profile_code: 'admin_system',
    label: 'Admin do Sistema',
    insights_mode: 'strategic_executive',
    default_period: '7d',
    data_depth: 'consolidated',
    visible_modules: ['dashboard', 'operational', 'proaction', 'chat', 'biblioteca', 'ai', 'admin', 'audit', 'settings'],
    cards: [
      { key: 'interactions_week', title: 'Interações (semana)', icon: 'message', color: 'blue' },
      { key: 'critical_alerts', title: 'Alertas críticos', icon: 'alert', color: 'red' },
      { key: 'open_proposals', title: 'Propostas em aberto', icon: 'target', color: 'purple' }
    ],
    charts: ['trend'],
    alerts: ['critical', 'high', 'medium'],
    widgets: ['smart_summary', 'ai_insights', 'recent_interactions', 'kpi_request', 'communication_panel'],
    default_filters: {}
  }
};

/** Mapeamento role + functional_area => profile_code */
const ROLE_AREA_TO_PROFILE = {
  ceo: { _default: 'ceo_executive' },
  diretor: {
    operations: 'director_operations',
    industrial: 'director_industrial',
    production: 'director_industrial',
    producao: 'director_industrial',
    maintenance: 'director_industrial',
    manutencao: 'director_industrial',
    quality: 'director_industrial',
    qualidade: 'director_industrial',
    hr: 'hr_management',
    rh: 'hr_management',
    recursos_humanos: 'hr_management',
    finance: 'finance_management',
    financeiro: 'finance_management',
    operacoes: 'director_operations',
    _default: 'director_operations'
  },
  gerente: {
    production: 'manager_production',
    maintenance: 'manager_maintenance',
    quality: 'manager_quality',
    hr: 'hr_management',
    finance: 'finance_management',
    producao: 'manager_production',
    manutencao: 'manager_maintenance',
    qualidade: 'manager_quality',
    recursos_humanos: 'hr_management',
    financeiro: 'finance_management',
    _default: 'manager_production'
  },
  coordenador: {
    production: 'coordinator_production',
    maintenance: 'coordinator_maintenance',
    quality: 'coordinator_quality',
    hr: 'hr_management',
    finance: 'finance_management',
    producao: 'coordinator_production',
    manutencao: 'coordinator_maintenance',
    qualidade: 'coordinator_quality',
    recursos_humanos: 'hr_management',
    financeiro: 'finance_management',
    _default: 'coordinator_production'
  },
  supervisor: {
    production: 'supervisor_production',
    maintenance: 'supervisor_maintenance',
    quality: 'supervisor_quality',
    hr: 'hr_management',
    finance: 'finance_management',
    producao: 'supervisor_production',
    manutencao: 'supervisor_maintenance',
    qualidade: 'supervisor_quality',
    recursos_humanos: 'hr_management',
    financeiro: 'finance_management',
    _default: 'supervisor_production'
  },
  colaborador: {
    production: 'operator_floor',
    maintenance: 'technician_maintenance',
    quality: 'inspector_quality',
    pcp: 'analyst_pcp',
    hr: 'hr_management',
    recursos_humanos: 'hr_management',
    finance: 'finance_management',
    financeiro: 'finance_management',
    operations: 'operator_floor',
    operacoes: 'operator_floor',
    producao: 'operator_floor',
    manutencao: 'technician_maintenance',
    qualidade: 'inspector_quality',
    _default: 'operator_floor'
  },
  admin: { _default: 'admin_system' },
  rh: { _default: 'hr_management' },
  financeiro: { _default: 'finance_management' }
};

/** Inferir functional_area a partir de job_title (ordem importa: mais específico primeiro) */
const JOB_TITLE_TO_AREA = {
  'supervisor de qualidade': 'quality',
  'supervisor de manutenção': 'maintenance',
  'supervisor de manutencao': 'maintenance',
  'supervisor de produção': 'production',
  'supervisor de producao': 'production',
  'coordenador de qualidade': 'quality',
  'coordenador de manutenção': 'maintenance',
  'coordenador de manutencao': 'maintenance',
  'coordenador de produção': 'production',
  'coordenador de producao': 'production',
  'gerente de qualidade': 'quality',
  'gerente de manutenção': 'maintenance',
  'gerente de manutencao': 'maintenance',
  'gerente de produção': 'production',
  'gerente de producao': 'production',
  'diretor industrial': 'industrial',
  'diretor de operações': 'operations',
  'diretor de operacoes': 'operations',
  produção: 'production',
  producao: 'production',
  manutenção: 'maintenance',
  manutencao: 'maintenance',
  qualidade: 'quality',
  pcp: 'pcp',
  operador: 'production',
  mecânico: 'maintenance',
  mecanico: 'maintenance',
  eletricista: 'maintenance',
  eletromecânico: 'maintenance',
  eletromecanico: 'maintenance',
  técnico: 'maintenance',
  tecnico: 'maintenance',
  inspetor: 'quality',
  diretor: 'operations',
  gerente: 'production',
  coordenador: 'production',
  supervisor: 'production',
  rh: 'hr',
  financeiro: 'finance',
  admin: 'admin'
};

function inferAreaFromJobTitle(jobTitle) {
  if (!jobTitle || typeof jobTitle !== 'string') return null;
  const lower = jobTitle.toLowerCase().trim();
  const entries = Object.entries(JOB_TITLE_TO_AREA).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, area] of entries) {
    if (lower.includes(keyword)) return area;
  }
  return null;
}

function getProfile(profileCode) {
  return DASHBOARD_PROFILES[profileCode] || DASHBOARD_PROFILES.operator_floor;
}

function getAllProfiles() {
  return { ...DASHBOARD_PROFILES };
}

module.exports = {
  DASHBOARD_PROFILES,
  ROLE_AREA_TO_PROFILE,
  JOB_TITLE_TO_AREA,
  inferAreaFromJobTitle,
  getProfile,
  getAllProfiles
};
