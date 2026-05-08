'use strict';

/**
 * ContextualModuleOrchestrator (Phase 6)
 * --------------------------------------
 * A partir de uma `ContextualIdentity` (Motor B) decide:
 *
 *   - quais module_id são elegíveis  (catálogo declarativo)
 *   - quais module_id são proibidos  (LGPD/policy)
 *   - quais module_id são críticos   (devem estar presentes)
 *   - quais menu_keys devem entrar em `visible_modules`
 *   - resumo descritivo de "centros/ferramentas" contextuais
 *
 * Não muta entradas. Não invoca DB. Determinístico.
 */

const registry = require('./moduleRegistry');
const moduleCapabilities = require('./moduleCapabilities');

const SCORE_BIAS = Object.freeze({
  area_match: 0.30,
  axis_primary: 0.25,
  axis_listed: 0.10,
  function_match: 0.15,
  level_match: 0.05,
  capability_match: 0.10,
  universal_bonus: 0.40,
  critical_bonus: 0.50,
  level_mismatch_penalty: -0.40,
  area_mismatch_penalty: -0.20,
  function_mismatch_penalty: -0.15
});

function _hasAll(set, list) {
  if (!Array.isArray(list) || list.length === 0) return true;
  for (const c of list) if (!set.has(c)) return false;
  return true;
}

function _scoreModule(mod, identity, capsSet) {
  let score = 0;
  const reasons = [];

  if (mod.universal === true) {
    score += SCORE_BIAS.universal_bonus;
    reasons.push({ kind: 'universal', value: SCORE_BIAS.universal_bonus });
  }

  // capabilities (gate primário). Se faltarem, score se mantém baixo
  // — a decisão final usa _isEligible, mas o score continua expressivo.
  if (mod.required_capabilities && mod.required_capabilities.length > 0) {
    if (_hasAll(capsSet, mod.required_capabilities)) {
      score += SCORE_BIAS.capability_match;
      reasons.push({ kind: 'capability_match', caps: mod.required_capabilities.slice() });
    } else {
      score -= 0.5;
      reasons.push({ kind: 'capability_missing', caps: mod.required_capabilities.slice() });
    }
  }

  // axes
  if (Array.isArray(mod.compatible_axes) && mod.compatible_axes.length > 0) {
    const primary = identity.primary_axis || (Array.isArray(identity.axes_priority) ? identity.axes_priority[0] : null);
    if (primary && mod.compatible_axes.includes(primary)) {
      score += SCORE_BIAS.axis_primary;
      reasons.push({ kind: 'axis_primary', axis: primary });
    } else {
      const axes = identity.axes_priority || [];
      if (axes.some((a) => mod.compatible_axes.includes(a))) {
        score += SCORE_BIAS.axis_listed;
        reasons.push({ kind: 'axis_listed' });
      }
    }
  }

  // function
  if (Array.isArray(mod.compatible_functions) && mod.compatible_functions.length > 0) {
    if (mod.compatible_functions.includes(identity.function_type)) {
      score += SCORE_BIAS.function_match;
      reasons.push({ kind: 'function_match', fn: identity.function_type });
    } else {
      score += SCORE_BIAS.function_mismatch_penalty;
      reasons.push({ kind: 'function_mismatch' });
    }
  }

  // levels (1=topo, 5=base) — pode haver level null
  if (mod.compatible_levels && Number.isFinite(identity.hierarchy_level)) {
    const { min, max } = mod.compatible_levels;
    if (identity.hierarchy_level >= min && identity.hierarchy_level <= max) {
      score += SCORE_BIAS.level_match;
      reasons.push({ kind: 'level_match', lvl: identity.hierarchy_level });
    } else {
      score += SCORE_BIAS.level_mismatch_penalty;
      reasons.push({ kind: 'level_mismatch', lvl: identity.hierarchy_level });
    }
  }

  // area
  if (Array.isArray(mod.compatible_areas) && mod.compatible_areas.length > 0) {
    if (identity.area && mod.compatible_areas.includes(identity.area)) {
      score += SCORE_BIAS.area_match;
      reasons.push({ kind: 'area_match', area: identity.area });
    } else {
      score += SCORE_BIAS.area_mismatch_penalty;
      reasons.push({ kind: 'area_mismatch' });
    }
  }

  return { score: Math.max(-2, Math.min(2, score)), reasons };
}

/**
 * Decide se um módulo é elegível a aparecer (gate, separado do score).
 * Universals passam sempre. Caso contrário exige capabilities + alinhamento
 * mínimo (axes OR functions OR areas).
 */
function _isEligible(mod, identity, capsSet) {
  if (mod.universal === true) return { ok: true };
  if (mod.required_capabilities && mod.required_capabilities.length > 0) {
    if (!_hasAll(capsSet, mod.required_capabilities)) {
      return { ok: false, reason: 'capability_missing', caps: mod.required_capabilities.slice() };
    }
  }
  // alinhamento mínimo (qualquer um dos eixos/área/função)
  let aligned = false;
  if (Array.isArray(mod.compatible_areas) && mod.compatible_areas.length > 0) {
    if (identity.area && mod.compatible_areas.includes(identity.area)) aligned = true;
  } else {
    aligned = aligned || true; // sem restrição
  }
  if (!aligned && Array.isArray(mod.compatible_axes) && mod.compatible_axes.length > 0) {
    const axes = identity.axes_priority || [];
    if (axes.some((a) => mod.compatible_axes.includes(a))) aligned = true;
  }
  if (!aligned && Array.isArray(mod.compatible_functions) && mod.compatible_functions.length > 0) {
    if (mod.compatible_functions.includes(identity.function_type)) aligned = true;
  }
  // se compatible_levels excluir explicitamente, recusa
  if (mod.compatible_levels && Number.isFinite(identity.hierarchy_level)) {
    const { min, max } = mod.compatible_levels;
    if (!(identity.hierarchy_level >= min && identity.hierarchy_level <= max)) {
      return { ok: false, reason: 'level_mismatch', detail: { min, max, lvl: identity.hierarchy_level } };
    }
  }
  if (!aligned) return { ok: false, reason: 'no_alignment' };
  return { ok: true };
}

/**
 * Orquestra os módulos para a identidade.
 *
 * @param {object} identity ContextualIdentity (forma de identityResolver)
 * @returns {{
 *   allowed_module_ids: string[],
 *   denied: Array<{module_id:string, reason:string, detail?:object}>,
 *   menu_keys: string[],
 *   contextual_modules: Array<{module_id:string, category:string, label:string, paths:string[], score:number, criticality:number, source:string}>,
 *   critical_required: string[],
 *   forbidden_required: string[],
 *   trace: object
 * }}
 */
function orchestrate(identity) {
  const ident = identity || {};
  const capsSet = new Set(Array.isArray(ident.capabilities) ? ident.capabilities : []);

  // 1) injeta capabilities-de-módulo (extensão namespace `view:module:*`)
  const moduleCaps = moduleCapabilities.deriveModuleCapabilities({
    function_type: ident.function_type,
    area: ident.area,
    axes_priority: ident.axes_priority || [],
    capabilities: Array.from(capsSet)
  });
  for (const c of moduleCaps.module_capabilities) capsSet.add(c);

  const all = registry.getAllModules();
  const allowed = [];
  const denied = [];

  // 2) elegibilidade + score
  for (const mod of all) {
    const eligibility = _isEligible(mod, ident, capsSet);
    if (!eligibility.ok) {
      denied.push({ module_id: mod.module_id, reason: eligibility.reason, detail: eligibility.detail || null });
      continue;
    }
    const sc = _scoreModule(mod, ident, capsSet);
    allowed.push({
      module_id: mod.module_id,
      menu_key: mod.menu_key,
      category: mod.category,
      label: mod.label,
      paths: mod.paths.slice(),
      score: Number(sc.score.toFixed(3)),
      criticality: mod.criticality,
      lgpd_scope: mod.lgpd_scope,
      universal: mod.universal === true,
      reasons: sc.reasons
    });
  }

  // 3) críticos garantidos (se forem elegíveis e estiverem em allowed)
  const critical = registry.getCriticalModulesFor(ident.function_type, ident.area);

  // 4) proibidos: remove imediatamente do allowed (LGPD/policy hard-deny)
  const forbidden = registry.getForbiddenModulesFor(ident.function_type, ident.area);
  const forbiddenSet = new Set(forbidden);
  const finalAllowed = allowed.filter((m) => {
    if (forbiddenSet.has(m.module_id)) {
      denied.push({ module_id: m.module_id, reason: 'forbidden_by_policy' });
      return false;
    }
    return true;
  });

  // 5) overload prevention
  const maxModules = registry.getMaxModulesFor(ident.function_type);
  finalAllowed.sort((a, b) => {
    if (a.universal !== b.universal) return a.universal ? -1 : 1;
    if (b.criticality !== a.criticality) return b.criticality - a.criticality;
    return b.score - a.score;
  });
  let trimmed = finalAllowed;
  let overloaded = false;
  if (finalAllowed.length > maxModules) {
    overloaded = true;
    // mantém universais e críticos sempre; corta outros
    const criticalSet = new Set(critical);
    const must = finalAllowed.filter((m) => m.universal || criticalSet.has(m.module_id));
    const opt = finalAllowed.filter((m) => !m.universal && !criticalSet.has(m.module_id));
    const remaining = Math.max(0, maxModules - must.length);
    trimmed = must.concat(opt.slice(0, remaining));
    for (const m of opt.slice(remaining)) {
      denied.push({ module_id: m.module_id, reason: 'overload_trim' });
    }
  }

  // 6) menu_keys (vocabulário canónico do frontend)
  const menuKeys = new Set();
  for (const m of trimmed) {
    if (m.menu_key) menuKeys.add(m.menu_key);
  }

  return {
    allowed_module_ids: trimmed.map((m) => m.module_id),
    denied,
    menu_keys: Array.from(menuKeys).sort(),
    contextual_modules: trimmed.map((m) => ({
      module_id: m.module_id,
      category: m.category,
      label: m.label,
      paths: m.paths,
      score: m.score,
      criticality: m.criticality,
      lgpd_scope: m.lgpd_scope,
      source: m.universal ? 'universal' : 'orchestrated'
    })),
    critical_required: critical,
    forbidden_required: forbidden,
    overloaded,
    trace: {
      function_type: ident.function_type || null,
      area: ident.area || null,
      hierarchy_level: ident.hierarchy_level ?? null,
      capabilities_count: capsSet.size,
      module_capabilities_added: moduleCaps.module_capabilities,
      module_capabilities_rationale: moduleCaps.rationale,
      max_modules: maxModules,
      total_eligible: allowed.length,
      total_denied: denied.length
    }
  };
}

module.exports = {
  orchestrate,
  // exposed for tests
  _isEligible,
  _scoreModule,
  SCORE_BIAS
};
