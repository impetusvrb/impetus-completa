'use strict';

/**
 * Identidade contextual (Phase 2 do plano de migração).
 *
 * Esta identidade é DERIVADA do utilizador autenticado actual. Não há
 * migração de BD nesta fase. Os campos antigos (`role`, `functional_area`,
 * `dashboard_profile`, `permissions`, `hierarchy_level`, `job_title`,
 * `department`) continuam a ser a fonte da verdade.
 *
 * O resolver é PURO: dado o mesmo utilizador, devolve sempre a mesma
 * identidade. Sem chamadas a DB, sem efeitos colaterais.
 *
 * Forma da saída (ContextualIdentity):
 *
 *   {
 *     user_id, company_id,
 *     role_normalized,
 *     area, function_type,
 *     hierarchy_level, scope,
 *     axes_priority: [...],   // ordenados (índice 0 = primário)
 *     capabilities: [...],
 *     // metadados para explainability
 *     sources: {
 *       function: 'role'|'hierarchy'|'fallback',
 *       area: 'functional_area'|'company_role_dashboard_hint'|'department'|'context_interpreter'|'fallback',
 *       capabilities: { implicit: [...], from_permissions: [...] }
 *     },
 *     trace: [ { step, input, output } ]
 *   }
 */

const { resolveFunctionType, normalizeRole, FUNCTION_DEFAULTS } = require('./functionResolver');
const { resolveAreaId, getAxesPriority } = require('../axes/axesPriorityCatalog');
const { deriveCapabilities } = require('../axes/capabilitiesDeriver');

let _profileContextInterpreter = null;
function _getProfileContextInterpreter() {
  if (_profileContextInterpreter !== null) return _profileContextInterpreter;
  try {
    _profileContextInterpreter = require('../../services/profileContextInterpreter');
  } catch (_) {
    _profileContextInterpreter = false;
  }
  return _profileContextInterpreter;
}

/**
 * Resolve area com fallback para o `profileContextInterpreter` legado
 * (Motor B existente) — usa keyword-scoring NFD em PT-BR. Esta é a forma
 * compatível e correcta de inferir área quando o utilizador não declarou.
 */
function _resolveAreaWithFallback(user, traceOut) {
  const direct = resolveAreaId(user);
  if (direct) {
    traceOut.push({ step: 'area:catalog_alias', input: user.functional_area || user.department || null, output: direct });
    return { area: direct, source: 'functional_area' };
  }
  const interp = _getProfileContextInterpreter();
  if (!interp || !interp.interpretProfileContext) {
    traceOut.push({ step: 'area:no_interpreter', output: null });
    return { area: null, source: 'fallback' };
  }
  try {
    const ctx = interp.interpretProfileContext(user || {});
    const primary = ctx?.primary_axis || null;
    // mapa axis → area canónica (subset que faz sentido para área funcional)
    const AXIS_TO_AREA = {
      eixo_financeiro: 'finance',
      eixo_executivo: 'operations',
      eixo_operacional: 'operations',
      eixo_manutencao: 'maintenance',
      eixo_qualidade: 'quality',
      eixo_humano: 'hr',
      eixo_planejamento: 'pcp',
      eixo_seguranca: 'operations',
      eixo_logistica: 'operations',
      eixo_estoque: 'operations',
      eixo_laboratorial: 'quality'
    };
    const inferred = primary ? AXIS_TO_AREA[primary] || null : null;
    traceOut.push({ step: 'area:context_interpreter', input: { primary_axis: primary, axes: ctx?.axes }, output: inferred });
    if (inferred) return { area: inferred, source: 'context_interpreter' };
  } catch (err) {
    traceOut.push({ step: 'area:interpreter_error', output: null, error: err && err.message ? err.message : String(err) });
  }
  return { area: null, source: 'fallback' };
}

const SCOPE_BY_FUNCTION = Object.freeze({
  decisao_estrategica: 'global',
  analise: 'sector',
  governanca: 'global',
  supervisao: 'team',
  execucao: 'individual'
});

function _resolveScope(user, functionType) {
  if (user && (user.role === 'ceo' || user.role === 'admin')) return 'global';
  return SCOPE_BY_FUNCTION[functionType] || 'individual';
}

/**
 * Cria a identidade contextual derivada.
 * @param {object} user req.user típico (ver middleware/auth)
 * @returns {object} ContextualIdentity (forma documentada acima)
 */
function buildContextualIdentity(user) {
  const trace = [];
  const safe = user || {};

  // 1) role normalizado
  const role = normalizeRole(safe.role);
  trace.push({ step: 'role:normalize', input: safe.role || null, output: role });

  // 2) function_type (derivado de role + hierarquia)
  const fnRes = resolveFunctionType(safe);
  trace.push({ step: 'function:resolve', input: { role, hierarchy_level: safe.hierarchy_level }, output: fnRes });

  // 3) area (com fallback para context_interpreter)
  const areaRes = _resolveAreaWithFallback(safe, trace);
  const area = areaRes.area;

  // 4) axes_priority (declarativo)
  let axes = getAxesPriority({ area, functionType: fnRes.function_type });
  trace.push({ step: 'axes:priority', input: { area, function_type: fnRes.function_type }, output: axes });

  // 5) capabilities derivadas
  const capRes = deriveCapabilities({
    functionType: fnRes.function_type,
    area,
    role,
    permissions: Array.isArray(safe.permissions) ? safe.permissions : []
  });

  // 5.b) Ampliação aditiva: se capabilities explícitas (via permissions)
  // concedem visão a um eixo que NÃO estava na axes_priority do utilizador,
  // adicionamos esse eixo ao FIM da lista (peso baixo) — preserva escolha
  // primária mas torna o widget elegível. Sem isto, conceder VIEW_FINANCIAL
  // a um supervisor de produção não exporia widgets financeiros.
  const CAPABILITY_TO_AXIS = {
    'view:financial': 'eixo_financeiro',
    'view:strategic': 'eixo_executivo',
    'view:operational': 'eixo_operacional',
    'view:maintenance': 'eixo_manutencao',
    'view:quality': 'eixo_qualidade',
    'view:hr': 'eixo_humano',
    'view:logistics': 'eixo_logistica',
    'view:safety': 'eixo_seguranca'
  };
  const explicitCaps = new Set(capRes.from_permissions || []);
  const axesSet = new Set(axes);
  const expanded = [];
  const unlockedAxes = [];
  for (const cap of explicitCaps) {
    const ax = CAPABILITY_TO_AXIS[cap];
    if (ax && !axesSet.has(ax)) {
      axes = axes.concat([ax]);
      axesSet.add(ax);
      expanded.push({ capability: cap, axis: ax });
      unlockedAxes.push(ax);
    }
  }
  if (expanded.length > 0) {
    trace.push({ step: 'axes:expanded_by_capabilities', input: Array.from(explicitCaps), output: expanded });
  }
  trace.push({
    step: 'capabilities:derive',
    input: { fn: fnRes.function_type, area, role, perms_len: Array.isArray(safe.permissions) ? safe.permissions.length : 0 },
    output: { capabilities_count: capRes.capabilities.length, implicit_count: capRes.implicit.length }
  });

  let contextualOrgCaps = [];
  try {
    const contextualSystemAdmin = require('../../services/contextualSystemAdminService');
    contextualOrgCaps = contextualSystemAdmin.resolveContextualAdminCapabilities(safe);
    if (contextualOrgCaps.length > 0) {
      trace.push({ step: 'capabilities:contextual_system_admin', output: contextualOrgCaps });
    }
  } catch (_e) {
    contextualOrgCaps = [];
  }
  const capabilitiesMerged = [...new Set([...(capRes.capabilities || []), ...contextualOrgCaps])].sort();

  // 6) scope
  const scope = _resolveScope(safe, fnRes.function_type);
  trace.push({ step: 'scope:resolve', output: scope });

  return {
    user_id: safe.id ?? null,
    company_id: safe.company_id ?? null,
    role_raw: safe.role ?? null,
    role_normalized: role || null,
    area: area || null,
    function_type: fnRes.function_type,
    function_defaults: FUNCTION_DEFAULTS[fnRes.function_type] || null,
    hierarchy_level: safe.hierarchy_level ?? null,
    scope,
    axes_priority: axes,
    primary_axis: axes[0] || null,
    unlocked_axes: unlockedAxes,
    capabilities: capabilitiesMerged,
    contextual_org_capabilities: contextualOrgCaps,
    job_title_text: safe.job_title || null,
    department_text: safe.department || safe.department_resolved_name || null,
    sources: {
      function: fnRes.source,
      area: areaRes.source,
      capabilities: { implicit: capRes.implicit, from_permissions: capRes.from_permissions }
    },
    rationale: capRes.rationale,
    trace
  };
}

module.exports = {
  buildContextualIdentity,
  // expostos para reuso/testing
  _resolveAreaWithFallback,
  SCOPE_BY_FUNCTION
};
