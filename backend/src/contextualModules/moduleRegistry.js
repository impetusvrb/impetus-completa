'use strict';

/**
 * ContextualModuleRegistry (Phase 6 — Functional Module Orchestration)
 * ====================================================================
 *
 * Registry declarativo dos módulos / centros operacionais / ferramentas
 * contextuais do IMPETUS. Cada item descreve, sem hardcodes no frontend,
 * a quem e em que contexto faz sentido aparecer.
 *
 * IMPORTANTE — preservação visual absoluta
 * ----------------------------------------
 * O frontend lê `visible_modules` como array de strings de um vocabulário
 * conhecido (`dashboard`, `operational`, `manuia`, `hr_intelligence`,
 * `quality_intelligence`, `anomaly_detection`, `audit`, `admin`, ...).
 *
 * Para preservar 100% do design, esta layer:
 *
 *   1) decide o conjunto de strings em `visible_modules` (mantém vocabulário);
 *   2) emite um array `contextual_modules` com metadados ricos descrevendo
 *      *centros/ferramentas* especializados (ex.: `mapa_vazamentos`,
 *      `centro_custos`, `pulse_rh`). Esta chave é nova, aditiva, ignorada
 *      pelo JSX actual e disponível para consumo futuro / auditoria.
 *
 * Cada entrada do registry declara:
 *   - module_id           id estável e único
 *   - menu_key            chave canónica em `visible_modules` ou null
 *                         se for um centro/ferramenta transversal
 *   - paths               rotas frontend onde o módulo se materializa
 *   - category            'core'|'financial'|'operational'|'maintenance'|
 *                         'quality'|'hr'|'safety'|'admin'|'ai'|'audit'|
 *                         'environment'|'risk'
 *   - label               legenda humana (PT-BR)
 *   - description         descrição funcional
 *   - required_capabilities  lista (AND) de capabilities necessárias
 *   - compatible_axes        eixos que naturalmente activam o módulo
 *   - compatible_functions   function_types alvo (vazio = qualquer)
 *   - compatible_levels      { min, max } de hierarchy_level (1=topo, 5=base)
 *   - compatible_areas       áreas funcionais alvo (vazio = qualquer)
 *   - lgpd_scope             'low'|'medium'|'high'
 *   - criticality            0..1 (probabilidade de pertencer a "críticos")
 *   - dependencies           lista de module_id requeridos
 *   - fallback_behavior      'soft_hide' | 'hard_deny' | 'show_disabled'
 *   - universal              boolean — se true entra para todos (core)
 */

/* eslint-disable max-len */

/** Catálogo declarativo. Ordenado por categoria para leitura humana. */
const CONTEXTUAL_MODULE_CATALOG = Object.freeze([
  // ---- core (sempre presentes) ----
  {
    module_id: 'dashboard',
    menu_key: 'dashboard',
    paths: ['/app', '/app/dashboard-vivo'],
    category: 'core',
    label: 'Dashboard',
    description: 'Painel inicial com visão geral.',
    required_capabilities: [],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 1.0,
    dependencies: [],
    fallback_behavior: 'soft_hide',
    universal: true
  },
  {
    module_id: 'settings',
    menu_key: 'settings',
    paths: ['/app/settings'],
    category: 'core',
    label: 'Configurações',
    description: 'Preferências de utilizador.',
    required_capabilities: [],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 1.0,
    dependencies: [],
    fallback_behavior: 'soft_hide',
    universal: true
  },
  {
    module_id: 'biblioteca',
    menu_key: 'biblioteca',
    paths: ['/app/biblioteca'],
    category: 'core',
    label: 'Biblioteca',
    description: 'Documentos, PDFs e materiais técnicos.',
    required_capabilities: ['view:operational'],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.6,
    dependencies: [],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'ai',
    menu_key: 'ai',
    paths: ['/app/chatbot'],
    category: 'ai',
    label: 'Assistente IA',
    description: 'Conversa com a IA contextual.',
    required_capabilities: ['view:operational'],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.8,
    dependencies: [],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'chat',
    menu_key: 'chat',
    paths: ['/chat'],
    category: 'core',
    label: 'Chat',
    description: 'Conversas internas.',
    required_capabilities: ['view:operational'],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.5,
    dependencies: [],
    fallback_behavior: 'soft_hide'
  },

  // ---- operational base ----
  {
    module_id: 'operational',
    menu_key: 'operational',
    paths: ['/app/operacional'],
    category: 'operational',
    label: 'Operacional',
    description: 'Operação industrial em tempo real.',
    required_capabilities: ['view:operational'],
    compatible_axes: ['eixo_operacional', 'eixo_executivo', 'eixo_manutencao', 'eixo_qualidade', 'eixo_seguranca'],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.9,
    dependencies: [],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'proaction',
    menu_key: 'proaction',
    paths: ['/app/proacao'],
    category: 'core',
    label: 'Pró-Ação',
    description: 'Registro de ações, propostas e sugestões operacionais. Acesso universal — todos os usuários.',
    required_capabilities: [],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.6,
    dependencies: [],
    fallback_behavior: 'soft_hide',
    universal: true
  },
  {
    module_id: 'registro_inteligente',
    menu_key: 'registro_inteligente',
    paths: ['/app/registro-inteligente'],
    category: 'core',
    label: 'Registro Inteligente',
    description: 'Captura e registro inteligente de informações operacionais. Acesso universal — todos os usuários.',
    required_capabilities: [],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.6,
    dependencies: [],
    fallback_behavior: 'soft_hide',
    universal: true
  },
  {
    module_id: 'cadastrar_com_ia',
    menu_key: 'cadastrar_com_ia',
    paths: ['/app/cadastrar-com-ia'],
    category: 'core',
    label: 'Cadastrar com IA',
    description: 'Entrada e cadastro de dados com suporte de inteligência artificial. Acesso universal — todos os usuários.',
    required_capabilities: [],
    compatible_axes: [],
    compatible_functions: [],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.6,
    dependencies: [],
    fallback_behavior: 'soft_hide',
    universal: true
  },

  // ---- financial / strategy ----
  {
    module_id: 'financial_intelligence',
    menu_key: 'operational',
    paths: ['/app/centro-custos-industriais', '/app/mapa-vazamento-financeiro'],
    category: 'financial',
    label: 'Inteligência Financeira',
    description: 'Centros de custo, perdas e vazamentos financeiros.',
    required_capabilities: ['view:financial'],
    compatible_axes: ['eixo_financeiro', 'eixo_executivo'],
    compatible_functions: ['decisao_estrategica', 'analise', 'governanca'],
    compatible_levels: { min: 1, max: 3 },
    compatible_areas: ['finance', 'operations', 'industrial', 'admin'],
    lgpd_scope: 'medium',
    criticality: 0.95,
    dependencies: ['operational'],
    fallback_behavior: 'hard_deny'
  },
  {
    module_id: 'cost_center',
    menu_key: 'operational',
    paths: ['/app/centro-custos-industriais'],
    category: 'financial',
    label: 'Centro de Custos',
    description: 'Análise de centros de custo industrial.',
    required_capabilities: ['view:financial'],
    compatible_axes: ['eixo_financeiro', 'eixo_executivo'],
    compatible_functions: ['decisao_estrategica', 'analise', 'governanca'],
    compatible_levels: { min: 1, max: 3 },
    compatible_areas: ['finance', 'operations', 'industrial', 'admin'],
    lgpd_scope: 'medium',
    criticality: 0.9,
    dependencies: ['operational'],
    fallback_behavior: 'hard_deny'
  },
  {
    module_id: 'losses_map',
    menu_key: 'operational',
    paths: ['/app/mapa-vazamento-financeiro'],
    category: 'financial',
    label: 'Mapa de Vazamentos',
    description: 'Mapa de perdas e vazamentos operacionais com impacto financeiro.',
    required_capabilities: ['view:financial', 'view:operational'],
    compatible_axes: ['eixo_financeiro', 'eixo_executivo', 'eixo_operacional'],
    compatible_functions: ['decisao_estrategica', 'analise', 'governanca'],
    compatible_levels: { min: 1, max: 3 },
    compatible_areas: ['finance', 'operations', 'industrial'],
    lgpd_scope: 'medium',
    criticality: 0.92,
    dependencies: ['operational'],
    fallback_behavior: 'hard_deny'
  },
  {
    module_id: 'cerebro_operacional',
    menu_key: 'operational',
    paths: ['/app/cerebro-operacional'],
    category: 'operational',
    label: 'Cérebro Operacional',
    description: 'Inteligência operacional consolidada.',
    required_capabilities: ['view:operational'],
    compatible_axes: ['eixo_operacional', 'eixo_executivo', 'eixo_financeiro'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'governanca'],
    compatible_levels: { min: 1, max: 4 },
    compatible_areas: ['finance', 'operations', 'industrial', 'admin'],
    lgpd_scope: 'low',
    criticality: 0.85,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'centro_operacoes_industrial',
    menu_key: 'operational',
    paths: ['/app/centro-operacoes-industrial'],
    category: 'operational',
    label: 'Centro de Operações Industrial',
    description: 'Visão consolidada de operações industriais.',
    required_capabilities: ['view:operational'],
    compatible_axes: ['eixo_operacional', 'eixo_executivo'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao'],
    compatible_levels: { min: 1, max: 4 },
    compatible_areas: ['operations', 'industrial', 'production', 'maintenance'],
    lgpd_scope: 'low',
    criticality: 0.85,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'centro_previsao_operacional',
    menu_key: 'operational',
    paths: ['/app/centro-previsao-operacional'],
    category: 'operational',
    label: 'Centro de Previsão Operacional',
    description: 'Previsão e tendências operacionais.',
    required_capabilities: ['view:operational'],
    compatible_axes: ['eixo_operacional', 'eixo_executivo', 'eixo_planejamento', 'eixo_financeiro'],
    compatible_functions: ['decisao_estrategica', 'analise'],
    compatible_levels: { min: 1, max: 3 },
    compatible_areas: ['operations', 'industrial', 'production', 'pcp', 'finance', 'admin'],
    lgpd_scope: 'low',
    criticality: 0.7,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'insights',
    menu_key: 'operational',
    paths: ['/app/insights'],
    category: 'operational',
    label: 'Insights Operacionais',
    description: 'Insights agregados.',
    required_capabilities: ['view:operational'],
    compatible_axes: [],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'governanca'],
    compatible_levels: { min: 1, max: 4 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.8,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },

  // ---- maintenance ----
  {
    module_id: 'manuia',
    menu_key: 'manuia',
    paths: ['/app/manutencao/manuia', '/app/manutencao/manuia-app'],
    category: 'maintenance',
    label: 'ManuIA',
    description: 'Inteligência de manutenção industrial.',
    required_capabilities: ['view:maintenance'],
    compatible_axes: ['eixo_manutencao', 'eixo_operacional'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'execucao', 'governanca'],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: ['maintenance', 'industrial', 'operations', 'production'],
    lgpd_scope: 'low',
    criticality: 0.85,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },

  // ---- quality ----
  {
    module_id: 'quality_intelligence',
    menu_key: 'quality_intelligence',
    paths: [],
    category: 'quality',
    label: 'Inteligência de Qualidade',
    description: 'KPIs e auditorias de qualidade.',
    required_capabilities: ['view:quality'],
    compatible_axes: ['eixo_qualidade', 'eixo_laboratorial', 'eixo_operacional'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'execucao', 'governanca'],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: ['quality', 'production', 'industrial', 'laboratory'],
    lgpd_scope: 'low',
    criticality: 0.85,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'safety_intelligence',
    menu_key: 'safety_intelligence',
    paths: ['/app/safety/operational', '/app/safety'],
    category: 'safety',
    label: 'Inteligência de Segurança',
    description: 'SST, incidentes, EPI, PTW e compliance de segurança do trabalho.',
    required_capabilities: ['view:operational'],
    compatible_axes: ['eixo_seguranca', 'eixo_operacional'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'execucao', 'governanca'],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: ['safety', 'environmental_health_safety'],
    lgpd_scope: 'low',
    criticality: 0.9,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'environment_intelligence',
    menu_key: 'environment_intelligence',
    paths: ['/app/environment/operational', '/app/environment'],
    category: 'environment',
    label: 'Inteligência Ambiental',
    description: 'KPIs ambientais, ESG, resíduos, água, energia e utilidades.',
    required_capabilities: ['view:operational'],
    compatible_axes: ['eixo_ambiental', 'eixo_sustentabilidade', 'eixo_utilidades'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'execucao', 'governanca'],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: ['environmental', 'sustainability', 'esg', 'environmental_health_safety', 'utilities'],
    lgpd_scope: 'low',
    criticality: 0.9,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'raw_material_lots',
    menu_key: 'raw_material_lots',
    paths: [],
    category: 'quality',
    label: 'Lotes de Matéria-Prima',
    description: 'Rastreio de lotes e fornecedores.',
    required_capabilities: ['view:quality'],
    compatible_axes: ['eixo_qualidade', 'eixo_logistica'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'execucao', 'governanca'],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: ['quality', 'production'],
    lgpd_scope: 'low',
    criticality: 0.7,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },

  // ---- hr ----
  {
    module_id: 'hr_intelligence',
    menu_key: 'hr_intelligence',
    paths: [],
    category: 'hr',
    label: 'Inteligência de Pessoas',
    description: 'Indicadores de RH/People analytics.',
    required_capabilities: ['view:hr'],
    compatible_axes: ['eixo_humano', 'eixo_executivo'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'governanca'],
    compatible_levels: { min: 1, max: 4 },
    compatible_areas: ['hr', 'admin', 'operations', 'industrial', 'finance'],
    lgpd_scope: 'high',
    criticality: 0.9,
    dependencies: [],
    fallback_behavior: 'hard_deny'
  },
  {
    module_id: 'pulse_rh',
    menu_key: 'operational',
    paths: ['/app/pulse-rh'],
    category: 'hr',
    label: 'Pulse RH',
    description: 'Pulse e clima organizacional.',
    required_capabilities: ['view:hr'],
    compatible_axes: ['eixo_humano'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'execucao', 'governanca'],
    compatible_levels: { min: 1, max: 5 },
    compatible_areas: ['hr'],
    lgpd_scope: 'medium',
    criticality: 0.85,
    dependencies: [],
    fallback_behavior: 'soft_hide'
  },
  {
    module_id: 'pulse_gestao',
    menu_key: 'operational',
    paths: ['/app/pulse-gestao'],
    category: 'hr',
    label: 'Pulse Gestão',
    description: 'Pulse de gestão executiva.',
    required_capabilities: [],
    compatible_axes: ['eixo_humano', 'eixo_executivo'],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'governanca'],
    compatible_levels: { min: 1, max: 4 },
    compatible_areas: [],
    lgpd_scope: 'medium',
    criticality: 0.7,
    dependencies: [],
    fallback_behavior: 'soft_hide'
  },

  // ---- audit / risk ----
  {
    module_id: 'audit',
    menu_key: 'audit',
    paths: [],
    category: 'audit',
    label: 'Auditoria',
    description: 'Logs e auditoria.',
    required_capabilities: ['view:audit'],
    compatible_axes: [],
    compatible_functions: ['decisao_estrategica', 'governanca'],
    compatible_levels: { min: 1, max: 3 },
    compatible_areas: ['admin', 'finance', 'operations', 'industrial', 'quality', 'hr'],
    lgpd_scope: 'high',
    criticality: 0.85,
    dependencies: [],
    fallback_behavior: 'hard_deny'
  },
  {
    module_id: 'anomaly_detection',
    menu_key: 'anomaly_detection',
    paths: [],
    category: 'risk',
    label: 'Detecção de Anomalias',
    description: 'Anomalias estatísticas no comportamento operacional.',
    required_capabilities: ['view:operational'],
    compatible_axes: [],
    compatible_functions: ['decisao_estrategica', 'analise', 'supervisao', 'governanca'],
    compatible_levels: { min: 1, max: 4 },
    compatible_areas: [],
    lgpd_scope: 'low',
    criticality: 0.7,
    dependencies: ['operational'],
    fallback_behavior: 'soft_hide'
  },

  // ---- admin ----
  {
    module_id: 'admin',
    menu_key: 'admin',
    paths: ['/app/admin'],
    category: 'admin',
    label: 'Administração',
    description: 'Administração de utilizadores/empresa.',
    required_capabilities: ['act:configure'],
    compatible_axes: [],
    compatible_functions: ['decisao_estrategica', 'governanca'],
    compatible_levels: { min: 1, max: 2 },
    compatible_areas: ['admin', 'finance', 'operations'],
    lgpd_scope: 'high',
    criticality: 0.7,
    dependencies: [],
    fallback_behavior: 'hard_deny'
  }
]);

/** Vocabulário canónico de chaves do `visible_modules` (preserva contrato frontend). */
const CANONICAL_MENU_KEYS = Object.freeze([
  'dashboard',
  'operational',
  'proaction',
  'registro_inteligente',
  'cadastrar_com_ia',
  'chat',
  'biblioteca',
  'ai',
  'hr_intelligence',
  'anomaly_detection',
  'audit',
  'admin',
  'manuia',
  'quality_intelligence',
  'environment_intelligence',
  'safety_intelligence',
  'raw_material_lots',
  'settings'
]);

/** Lista de critical_for: para função+área, quais module_ids são críticos. */
const CRITICAL_BY_FUNCTION_AREA = Object.freeze({
  decisao_estrategica: {
    finance: ['financial_intelligence', 'losses_map', 'cost_center', 'centro_previsao_operacional', 'cerebro_operacional', 'insights'],
    operations: ['cerebro_operacional', 'centro_operacoes_industrial', 'insights', 'losses_map'],
    industrial: ['cerebro_operacional', 'centro_operacoes_industrial', 'manuia', 'insights'],
    production: ['centro_operacoes_industrial', 'quality_intelligence', 'insights'],
    maintenance: ['manuia', 'cerebro_operacional', 'insights'],
    quality: ['quality_intelligence', 'raw_material_lots', 'insights'],
    environmental: ['environment_intelligence', 'insights'],
    sustainability: ['environment_intelligence', 'insights'],
    esg: ['environment_intelligence', 'insights'],
    environmental_health_safety: ['environment_intelligence', 'insights'],
    utilities: ['environment_intelligence', 'insights'],
    hr: ['hr_intelligence', 'pulse_rh', 'pulse_gestao'],
    admin: ['audit', 'admin'],
    pcp: ['centro_previsao_operacional']
  },
  analise: {
    finance: ['financial_intelligence', 'cost_center', 'centro_previsao_operacional', 'insights'],
    operations: ['cerebro_operacional', 'insights'],
    industrial: ['centro_operacoes_industrial', 'manuia'],
    production: ['centro_operacoes_industrial', 'quality_intelligence'],
    maintenance: ['manuia'],
    quality: ['quality_intelligence'],
    environmental: ['environment_intelligence'],
    sustainability: ['environment_intelligence'],
    esg: ['environment_intelligence'],
    environmental_health_safety: ['environment_intelligence'],
    utilities: ['environment_intelligence'],
    hr: ['hr_intelligence', 'pulse_rh'],
    admin: ['audit'],
    pcp: ['centro_previsao_operacional']
  },
  supervisao: {
    operations: ['centro_operacoes_industrial', 'pulse_gestao'],
    industrial: ['centro_operacoes_industrial', 'manuia'],
    production: ['centro_operacoes_industrial', 'quality_intelligence'],
    maintenance: ['manuia'],
    quality: ['quality_intelligence'],
    environmental: ['environment_intelligence'],
    sustainability: ['environment_intelligence'],
    utilities: ['environment_intelligence'],
    hr: ['hr_intelligence', 'pulse_rh']
  },
  execucao: {
    maintenance: ['manuia'],
    quality: ['quality_intelligence'],
    production: ['operational']
  },
  governanca: {
    finance: ['audit', 'financial_intelligence'],
    operations: ['audit', 'cerebro_operacional'],
    quality: ['audit', 'quality_intelligence'],
    environmental: ['audit', 'environment_intelligence'],
    sustainability: ['audit', 'environment_intelligence'],
    esg: ['audit', 'environment_intelligence'],
    hr: ['audit', 'hr_intelligence'],
    admin: ['audit', 'admin']
  }
});

/** Lista de proibidos por função+área (LGPD/policy). */
const FORBIDDEN_BY_FUNCTION_AREA = Object.freeze({
  execucao: {
    finance: ['admin', 'audit'],
    operations: ['admin'],
    industrial: ['admin'],
    production: ['admin'],
    maintenance: ['admin'],
    quality: ['admin'],
    hr: ['admin', 'financial_intelligence', 'losses_map', 'cost_center'],
    pcp: ['admin']
  },
  supervisao: {
    operations: ['admin'],
    industrial: ['admin'],
    production: ['admin'],
    maintenance: ['admin'],
    quality: ['admin'],
    hr: ['financial_intelligence']
  },
  analise: {
    hr: ['financial_intelligence']
  }
});

/** Limites de "overload" da interface por função. */
const MAX_MODULES_BY_FUNCTION = Object.freeze({
  decisao_estrategica: 18,
  governanca: 16,
  analise: 14,
  supervisao: 12,
  execucao: 9
});

/** Index O(1) por id. */
const _BY_ID = Object.freeze(
  CONTEXTUAL_MODULE_CATALOG.reduce((acc, m) => {
    acc[m.module_id] = m;
    return acc;
  }, {})
);

function getModule(moduleId) {
  return _BY_ID[moduleId] || null;
}

function getAllModules() {
  return CONTEXTUAL_MODULE_CATALOG.slice();
}

function getModulesByMenuKey(menuKey) {
  return CONTEXTUAL_MODULE_CATALOG.filter((m) => m.menu_key === menuKey);
}

function getCriticalModulesFor(functionType, area) {
  const byFn = CRITICAL_BY_FUNCTION_AREA[functionType];
  if (!byFn) return [];
  if (area && Array.isArray(byFn[area])) return byFn[area].slice();
  return [];
}

function getForbiddenModulesFor(functionType, area) {
  const byFn = FORBIDDEN_BY_FUNCTION_AREA[functionType];
  if (!byFn) return [];
  if (area && Array.isArray(byFn[area])) return byFn[area].slice();
  return [];
}

function getMaxModulesFor(functionType) {
  return MAX_MODULES_BY_FUNCTION[functionType] || 10;
}

module.exports = {
  CONTEXTUAL_MODULE_CATALOG,
  CANONICAL_MENU_KEYS,
  CRITICAL_BY_FUNCTION_AREA,
  FORBIDDEN_BY_FUNCTION_AREA,
  MAX_MODULES_BY_FUNCTION,
  getModule,
  getAllModules,
  getModulesByMenuKey,
  getCriticalModulesFor,
  getForbiddenModulesFor,
  getMaxModulesFor
};
