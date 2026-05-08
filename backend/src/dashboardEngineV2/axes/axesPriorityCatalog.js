'use strict';

/**
 * Catálogo de prioridade de eixos.
 *
 * Em vez de inferir por keyword/regex no job_title (Motor A), o V2 declara
 * explicitamente qual a sequência de eixos prioritários para cada combinação
 * de (área, função). O catálogo é um dado, não um fluxo — substituível por
 * tabela em fases posteriores sem alterar o motor.
 *
 * Eixos canónicos (mantidos compatíveis com `dashboardWidgetRegistry.js`):
 *   eixo_executivo, eixo_financeiro, eixo_planejamento, eixo_humano,
 *   eixo_operacional, eixo_manutencao, eixo_qualidade, eixo_logistica,
 *   eixo_estoque, eixo_laboratorial, eixo_seguranca
 *
 * NÃO altera o `WIDGET_REGISTRY` nem a lista de eixos do Motor B existente.
 */

const AXES = Object.freeze({
  EXECUTIVO: 'eixo_executivo',
  FINANCEIRO: 'eixo_financeiro',
  PLANEJAMENTO: 'eixo_planejamento',
  HUMANO: 'eixo_humano',
  OPERACIONAL: 'eixo_operacional',
  MANUTENCAO: 'eixo_manutencao',
  QUALIDADE: 'eixo_qualidade',
  LOGISTICA: 'eixo_logistica',
  ESTOQUE: 'eixo_estoque',
  LABORATORIAL: 'eixo_laboratorial',
  SEGURANCA: 'eixo_seguranca'
});

const ALL_AXES = Object.freeze(Object.values(AXES));

/**
 * Catálogo principal: (area × function_type) → axes_priority.
 * Ordem importa — primeiro = primário (drives título, foco da IA, fallback).
 *
 * Cobertura: todas as áreas × todas as funções. Faltas caem em `_default`
 * declarado abaixo.
 */
const AXES_PRIORITY_BY_AREA_FUNCTION = Object.freeze({
  // ── FINANCE ────────────────────────────────────────────────────────────
  finance: {
    decisao_estrategica: [AXES.FINANCEIRO, AXES.EXECUTIVO, AXES.PLANEJAMENTO, AXES.OPERACIONAL],
    analise:             [AXES.FINANCEIRO, AXES.PLANEJAMENTO, AXES.EXECUTIVO],
    supervisao:          [AXES.FINANCEIRO, AXES.OPERACIONAL],
    execucao:            [AXES.FINANCEIRO],
    governanca:          [AXES.FINANCEIRO, AXES.EXECUTIVO]
  },

  // ── OPERATIONS / EXECUTIVO INDUSTRIAL ─────────────────────────────────
  operations: {
    decisao_estrategica: [AXES.EXECUTIVO, AXES.OPERACIONAL, AXES.PLANEJAMENTO, AXES.MANUTENCAO, AXES.FINANCEIRO],
    analise:             [AXES.OPERACIONAL, AXES.PLANEJAMENTO, AXES.EXECUTIVO],
    supervisao:          [AXES.OPERACIONAL, AXES.MANUTENCAO],
    execucao:            [AXES.OPERACIONAL],
    governanca:          [AXES.EXECUTIVO, AXES.OPERACIONAL]
  },

  // ── INDUSTRIAL (alias near operations, com forte peso operacional) ────
  industrial: {
    decisao_estrategica: [AXES.EXECUTIVO, AXES.OPERACIONAL, AXES.MANUTENCAO, AXES.PLANEJAMENTO, AXES.FINANCEIRO],
    analise:             [AXES.OPERACIONAL, AXES.MANUTENCAO, AXES.PLANEJAMENTO],
    supervisao:          [AXES.OPERACIONAL, AXES.MANUTENCAO, AXES.SEGURANCA],
    execucao:            [AXES.OPERACIONAL, AXES.MANUTENCAO],
    governanca:          [AXES.EXECUTIVO, AXES.OPERACIONAL]
  },

  // ── PRODUCTION (sub-área de operações, foco linha) ────────────────────
  production: {
    decisao_estrategica: [AXES.OPERACIONAL, AXES.EXECUTIVO, AXES.PLANEJAMENTO],
    analise:             [AXES.OPERACIONAL, AXES.PLANEJAMENTO, AXES.QUALIDADE],
    supervisao:          [AXES.OPERACIONAL, AXES.QUALIDADE, AXES.SEGURANCA],
    execucao:            [AXES.OPERACIONAL],
    governanca:          [AXES.OPERACIONAL, AXES.QUALIDADE]
  },

  // ── MAINTENANCE ───────────────────────────────────────────────────────
  maintenance: {
    decisao_estrategica: [AXES.MANUTENCAO, AXES.EXECUTIVO, AXES.OPERACIONAL, AXES.FINANCEIRO],
    analise:             [AXES.MANUTENCAO, AXES.OPERACIONAL, AXES.PLANEJAMENTO],
    supervisao:          [AXES.MANUTENCAO, AXES.OPERACIONAL, AXES.SEGURANCA],
    execucao:            [AXES.MANUTENCAO, AXES.OPERACIONAL],
    governanca:          [AXES.MANUTENCAO, AXES.SEGURANCA]
  },

  // ── QUALITY ───────────────────────────────────────────────────────────
  quality: {
    decisao_estrategica: [AXES.QUALIDADE, AXES.EXECUTIVO, AXES.OPERACIONAL],
    analise:             [AXES.QUALIDADE, AXES.LABORATORIAL, AXES.OPERACIONAL],
    supervisao:          [AXES.QUALIDADE, AXES.OPERACIONAL, AXES.LABORATORIAL],
    execucao:            [AXES.QUALIDADE, AXES.LABORATORIAL],
    governanca:          [AXES.QUALIDADE, AXES.LABORATORIAL]
  },

  // ── HR ────────────────────────────────────────────────────────────────
  hr: {
    decisao_estrategica: [AXES.HUMANO, AXES.EXECUTIVO, AXES.PLANEJAMENTO],
    analise:             [AXES.HUMANO, AXES.PLANEJAMENTO],
    supervisao:          [AXES.HUMANO, AXES.OPERACIONAL],
    execucao:            [AXES.HUMANO],
    governanca:          [AXES.HUMANO, AXES.EXECUTIVO]
  },

  // ── PCP ───────────────────────────────────────────────────────────────
  pcp: {
    decisao_estrategica: [AXES.PLANEJAMENTO, AXES.OPERACIONAL, AXES.EXECUTIVO],
    analise:             [AXES.PLANEJAMENTO, AXES.OPERACIONAL, AXES.QUALIDADE],
    supervisao:          [AXES.PLANEJAMENTO, AXES.OPERACIONAL],
    execucao:            [AXES.PLANEJAMENTO, AXES.OPERACIONAL],
    governanca:          [AXES.PLANEJAMENTO, AXES.OPERACIONAL]
  },

  // ── ADMIN (sistema, governança transversal) ───────────────────────────
  admin: {
    decisao_estrategica: [AXES.EXECUTIVO, AXES.OPERACIONAL, AXES.FINANCEIRO, AXES.HUMANO],
    analise:             [AXES.EXECUTIVO, AXES.OPERACIONAL],
    supervisao:          [AXES.OPERACIONAL, AXES.SEGURANCA],
    execucao:            [AXES.OPERACIONAL],
    governanca:          [AXES.EXECUTIVO, AXES.OPERACIONAL, AXES.SEGURANCA]
  }
});

/**
 * Fallback determinístico quando (area, function_type) não está catalogado.
 * Usa só function_type como pivot para evitar quebra silenciosa.
 */
const AXES_PRIORITY_BY_FUNCTION_DEFAULT = Object.freeze({
  decisao_estrategica: [AXES.EXECUTIVO, AXES.OPERACIONAL, AXES.PLANEJAMENTO, AXES.FINANCEIRO],
  analise:             [AXES.OPERACIONAL, AXES.PLANEJAMENTO, AXES.EXECUTIVO],
  supervisao:          [AXES.OPERACIONAL],
  execucao:            [AXES.OPERACIONAL],
  governanca:          [AXES.EXECUTIVO, AXES.OPERACIONAL]
});

/**
 * Aliases de área aceites a partir do utilizador.
 * Mantém compatibilidade com `users.functional_area`,
 * `company_role_dashboard_hint` e `users.department`.
 */
const AREA_ALIASES = Object.freeze({
  finance: 'finance',
  financeiro: 'finance',
  financas: 'finance',
  controladoria: 'finance',
  tesouraria: 'finance',

  operations: 'operations',
  operacoes: 'operations',
  operacional: 'operations',

  industrial: 'industrial',

  production: 'production',
  producao: 'production',

  maintenance: 'maintenance',
  manutencao: 'maintenance',

  quality: 'quality',
  qualidade: 'quality',

  hr: 'hr',
  rh: 'hr',
  recursos_humanos: 'hr',

  pcp: 'pcp',
  planejamento: 'pcp',

  admin: 'admin',
  administracao: 'admin'
});

function _normArea(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Resolve o id canónico da área a partir do utilizador.
 * Não toca em DB. Não infere por regex no job_title — esse trabalho é
 * feito pelo `profileContextInterpreter` legado quando area=null.
 */
function resolveAreaId(user) {
  if (!user) return null;
  const candidates = [
    user.functional_area,
    user.company_role_dashboard_hint,
    user.area,
    user.department,
    user.department_resolved_name
  ];
  for (const raw of candidates) {
    const norm = _normArea(raw);
    if (norm && AREA_ALIASES[norm]) return AREA_ALIASES[norm];
  }
  return null;
}

/**
 * Devolve a sequência de eixos prioritários para o utilizador, dado o
 * function_type já resolvido. NUNCA devolve lista vazia — usa fallback.
 */
function getAxesPriority({ area, functionType }) {
  const fn = String(functionType || 'execucao');
  if (area && AXES_PRIORITY_BY_AREA_FUNCTION[area] && AXES_PRIORITY_BY_AREA_FUNCTION[area][fn]) {
    return AXES_PRIORITY_BY_AREA_FUNCTION[area][fn].slice();
  }
  if (AXES_PRIORITY_BY_FUNCTION_DEFAULT[fn]) {
    return AXES_PRIORITY_BY_FUNCTION_DEFAULT[fn].slice();
  }
  return [AXES.OPERACIONAL];
}

module.exports = {
  AXES,
  ALL_AXES,
  AREA_ALIASES,
  AXES_PRIORITY_BY_AREA_FUNCTION,
  AXES_PRIORITY_BY_FUNCTION_DEFAULT,
  resolveAreaId,
  getAxesPriority
};
