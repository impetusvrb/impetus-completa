'use strict';

/**
 * Catálogo declarativo de políticas organizacionais.
 *
 * Cada política tem:
 *   - id              identificador único
 *   - description     racional humano (auditoria)
 *   - applies_to      condições para a regra disparar
 *   - effect          'allow' | 'deny' | 'augment_capabilities'
 *   - widgets         (opcional) lista alvo
 *   - capabilities    (opcional, apenas com effect=augment_capabilities)
 *   - lgpd            (opcional) classificação de sensibilidade
 *
 * applies_to.dimensões suportadas:
 *   role_normalized | function_type | area | hierarchy_level_max |
 *   hierarchy_level_min | scope | tag (futuro)
 *
 * Avaliação: o `dashboardPolicyEngine` percorre as políticas em ordem;
 * effect 'deny' ganha sempre sobre 'allow'/'augment'. Política sem match
 * = não aplicada. Sem regra → comportamento default (capabilities).
 */

const POLICY_CATALOG = Object.freeze([
  // ── DIRETORES FINANCEIROS / CFO ──────────────────────────────────────
  {
    id: 'cfo_full_financial_view',
    description: 'CFO/Diretor Financeiro tem visão completa de perdas, custos, margem e fluxo.',
    applies_to: { role_normalized_in: ['ceo', 'diretor'], area_in: ['finance'] },
    effect: 'augment_capabilities',
    capabilities: ['view:financial', 'view:strategic', 'data:cross_sector', 'data:export', 'act:approve'],
    lgpd: { sensitivity: 'high', basis: 'legitimate_interest' }
  },
  {
    id: 'cfo_widgets_required',
    description: 'CFO/Diretor Financeiro deve receber widgets críticos financeiros.',
    applies_to: { role_normalized_in: ['ceo', 'diretor'], area_in: ['finance'] },
    effect: 'allow',
    widgets: ['centro_custos', 'mapa_vazamentos', 'desperdicio', 'indicadores_executivos', 'grafico_custos_setor', 'centro_previsao']
  },

  // ── DIRETOR INDUSTRIAL ───────────────────────────────────────────────
  {
    id: 'industrial_director_strategic',
    description: 'Diretor Industrial precisa de operação consolidada e manutenção.',
    applies_to: { role_normalized_in: ['ceo', 'diretor'], area_in: ['industrial', 'operations', 'production', 'maintenance'] },
    effect: 'augment_capabilities',
    capabilities: ['view:operational', 'view:maintenance', 'view:strategic', 'view:safety', 'data:cross_sector', 'act:approve']
  },

  // ── SUPERVISOR ───────────────────────────────────────────────────────
  {
    id: 'supervisor_realtime_only',
    description: 'Supervisor recebe dados de tempo real do próprio setor; sem acesso financeiro corporativo.',
    applies_to: { function_type: 'supervisao' },
    effect: 'augment_capabilities',
    capabilities: ['view:operational', 'view:safety']
  },
  {
    id: 'supervisor_no_corporate_finance',
    description: 'Supervisores NÃO podem ver margem corporativa nem mapa de vazamentos a nível empresa.',
    applies_to: { function_type: 'supervisao' },
    effect: 'deny',
    widgets: ['grafico_margem']
  },

  // ── OPERADOR / EXECUÇÃO ──────────────────────────────────────────────
  {
    id: 'operator_no_strategic_data',
    description: 'Operadores NÃO acessam indicadores estratégicos nem margem financeira.',
    applies_to: { function_type: 'execucao' },
    effect: 'deny',
    widgets: ['indicadores_executivos', 'resumo_executivo', 'centro_custos', 'grafico_custos_setor', 'mapa_vazamentos', 'grafico_margem'],
    lgpd: { sensitivity: 'high', basis: 'least_privilege' }
  },

  // ── RH BUSINESS PARTNER ──────────────────────────────────────────────
  {
    id: 'hr_bp_pulse_access',
    description: 'RH/HRBP tem acesso a Pulse RH (humano, planejamento) sem dados financeiros corporativos.',
    applies_to: { area_in: ['hr'] },
    effect: 'augment_capabilities',
    capabilities: ['view:hr']
  },
  {
    id: 'hr_bp_no_financial_corporate',
    description: 'RH/HRBP NÃO recebe widgets financeiros corporativos por default.',
    applies_to: { area_in: ['hr'], function_type_not: 'decisao_estrategica' },
    effect: 'deny',
    widgets: ['centro_custos', 'mapa_vazamentos', 'grafico_custos_setor', 'grafico_margem']
  },

  // ── SEGURANÇA DO TRABALHO ────────────────────────────────────────────
  {
    id: 'safety_widgets_required',
    description: 'Profissionais de Segurança recebem alertas e mapa de manutenção.',
    applies_to: { responsibilities_includes: 'seguranca' },
    effect: 'augment_capabilities',
    capabilities: ['view:safety', 'view:maintenance']
  },

  // ── GOVERNANÇA / AUDITORIA ──────────────────────────────────────────
  {
    id: 'audit_read_all',
    description: 'Auditores têm leitura transversal sem capacidade de actuar.',
    applies_to: { function_type: 'governanca' },
    effect: 'augment_capabilities',
    capabilities: ['view:audit', 'view:operational', 'data:export']
  },
  {
    id: 'audit_no_act',
    description: 'Auditores NÃO podem aprovar nem executar.',
    applies_to: { function_type: 'governanca' },
    effect: 'deny',
    capabilities: ['act:approve', 'act:execute']
  },

  // ── LGPD: DADOS CORPORATIVOS SENSÍVEIS ───────────────────────────────
  {
    id: 'lgpd_data_cross_sector_min_hierarchy',
    description: 'data:cross_sector exige hierarchy_level ≤ 3 (gerência ou superior).',
    applies_to: { hierarchy_level_min: 4 }, // se utilizador é nível ≥4, regra dispara para *negar*
    effect: 'deny',
    capabilities: ['data:cross_sector'],
    lgpd: { sensitivity: 'medium', basis: 'least_privilege' }
  }
]);

module.exports = { POLICY_CATALOG };
