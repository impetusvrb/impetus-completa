'use strict';

/**
 * Resolução do papel funcional (function_type).
 *
 * O papel funcional é uma camada de abstracção independente da área:
 *   - decisao_estrategica  → CEOs, diretores: horizonte trimestral/anual
 *   - analise              → analistas, controllers: investigação detalhada
 *   - supervisao           → supervisores, coordenadores: acompanhamento operacional
 *   - execucao             → operadores, técnicos: tarefas do turno
 *   - governanca           → auditores, compliance: read-only transversal
 *
 * Esta resolução é DERIVADA do utilizador atual (sem migração de BD).
 * A função pública `resolveFunctionType(user)` é determinística e barata.
 */

const FUNCTION_TYPES = Object.freeze({
  DECISAO_ESTRATEGICA: 'decisao_estrategica',
  ANALISE: 'analise',
  SUPERVISAO: 'supervisao',
  EXECUCAO: 'execucao',
  GOVERNANCA: 'governanca'
});

const FUNCTION_DEFAULTS = Object.freeze({
  decisao_estrategica: {
    scope_default: 'global',
    language_default: 'strategic',
    data_depth: 'consolidated',
    granularity: ['week', 'month'],
    max_widgets: 10
  },
  analise: {
    scope_default: 'sector',
    language_default: 'analytical',
    data_depth: 'detailed',
    granularity: ['day', 'week', 'month'],
    max_widgets: 12
  },
  supervisao: {
    scope_default: 'team',
    language_default: 'operational',
    data_depth: 'operational',
    granularity: ['hour', 'day'],
    max_widgets: 9
  },
  execucao: {
    scope_default: 'individual',
    language_default: 'practical',
    data_depth: 'operational',
    granularity: ['hour'],
    max_widgets: 6
  },
  governanca: {
    scope_default: 'global',
    language_default: 'analytical',
    data_depth: 'detailed',
    granularity: ['day', 'week', 'month'],
    max_widgets: 8
  }
});

function _norm(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Mapa role-canónico → function_type. O role já é normalizado (en→pt) antes
 * de chegar aqui. Catch-all controlado: roles desconhecidos viram 'execucao'.
 */
const ROLE_TO_FUNCTION = Object.freeze({
  ceo: FUNCTION_TYPES.DECISAO_ESTRATEGICA,
  diretor: FUNCTION_TYPES.DECISAO_ESTRATEGICA,
  gerente: FUNCTION_TYPES.ANALISE,
  coordenador: FUNCTION_TYPES.SUPERVISAO,
  supervisor: FUNCTION_TYPES.SUPERVISAO,
  analista: FUNCTION_TYPES.ANALISE,
  auditor: FUNCTION_TYPES.GOVERNANCA,
  compliance: FUNCTION_TYPES.GOVERNANCA,
  inspetor: FUNCTION_TYPES.EXECUCAO,
  tecnico: FUNCTION_TYPES.EXECUCAO,
  operador: FUNCTION_TYPES.EXECUCAO,
  colaborador: FUNCTION_TYPES.EXECUCAO,
  admin: FUNCTION_TYPES.GOVERNANCA,
  rh: FUNCTION_TYPES.ANALISE,
  financeiro: FUNCTION_TYPES.ANALISE
});

/**
 * Normaliza role PT/EN para chave canónica em PT.
 * Não substitui o resolver legado — uso isolado dentro do V2.
 */
function normalizeRole(roleRaw) {
  const r = _norm(roleRaw);
  if (!r) return '';
  if (r === 'director' || r === 'directora' || r === 'diretora') return 'diretor';
  if (r === 'manager') return 'gerente';
  if (r === 'coordinator' || r === 'coordinadora' || r === 'coordenadora') return 'coordenador';
  if (r === 'supervisora' || r === 'supervisor_team') return 'supervisor';
  if (r === 'analyst') return 'analista';
  if (r === 'inspector') return 'inspetor';
  if (r === 'technician') return 'tecnico';
  if (r === 'operator') return 'operador';
  if (r === 'colaboradora' || r === 'employee' || r === 'staff') return 'colaborador';
  if (r === 'auditor') return 'auditor';
  if (r === 'human_resources' || r === 'rrhh') return 'rh';
  if (r === 'finance' || r === 'financeira') return 'financeiro';
  return r;
}

/**
 * Hierarquia → função, quando role estiver vazio/ambíguo.
 * Pesos alinhados a userContext.AREA_LEVELS (1=Direção, 5=Colaborador).
 */
function _functionFromHierarchy(level) {
  const n = Number(level);
  if (!Number.isFinite(n)) return FUNCTION_TYPES.EXECUCAO;
  if (n <= 1) return FUNCTION_TYPES.DECISAO_ESTRATEGICA;
  if (n === 2) return FUNCTION_TYPES.DECISAO_ESTRATEGICA;
  if (n === 3) return FUNCTION_TYPES.ANALISE;
  if (n === 4) return FUNCTION_TYPES.SUPERVISAO;
  return FUNCTION_TYPES.EXECUCAO;
}

/**
 * Resolve o papel funcional do utilizador.
 *   1) role normalizado → mapa canónico
 *   2) hierarchy_level (fallback)
 *   3) execucao (catch-all seguro)
 */
function resolveFunctionType(user) {
  if (!user) return { function_type: FUNCTION_TYPES.EXECUCAO, source: 'fallback', defaults: FUNCTION_DEFAULTS.execucao };
  const r = normalizeRole(user.role);
  if (r && ROLE_TO_FUNCTION[r]) {
    const ft = ROLE_TO_FUNCTION[r];
    return { function_type: ft, source: 'role', role_normalized: r, defaults: FUNCTION_DEFAULTS[ft] };
  }
  const hl = user.hierarchy_level ?? null;
  if (hl != null) {
    const ft = _functionFromHierarchy(hl);
    return { function_type: ft, source: 'hierarchy', role_normalized: r || null, defaults: FUNCTION_DEFAULTS[ft] };
  }
  return { function_type: FUNCTION_TYPES.EXECUCAO, source: 'fallback', role_normalized: r || null, defaults: FUNCTION_DEFAULTS.execucao };
}

module.exports = {
  FUNCTION_TYPES,
  FUNCTION_DEFAULTS,
  ROLE_TO_FUNCTION,
  normalizeRole,
  resolveFunctionType
};
