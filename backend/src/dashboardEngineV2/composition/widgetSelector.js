'use strict';

/**
 * Selector de widgets V2.
 *
 * Reusa o `WIDGET_REGISTRY` existente em `services/dashboardWidgetRegistry`
 * (não duplica). Adiciona:
 *
 *   1. Filtragem por capabilities — widgets cuja `capabilities_required`
 *      não está contida em `identity.capabilities` são EXCLUÍDOS.
 *   2. Bias por granularidade da função — widgets cuja categoria
 *      ('consolidated' / 'detailed' / 'operational') alinha com o
 *      `function_type` recebem boost no score.
 *   3. Prioridade declarativa de eixos — `axes_priority[i]` aplica peso
 *      decrescente (i=0 → peso máximo).
 *   4. Explainability completa — cada widget devolvido carrega `score`,
 *      `axes_overlap`, `axis_priority_bonus`, `granularity_bias`,
 *      `capabilities_required`, `capabilities_ok`, `rationale`.
 *
 * Backwards-compat: o output é compatível com `buildWidgetSet` legado
 * (ex.: cada item tem `id`, `posicao`, `tamanho`, `prioridade`,
 * `contexto`); os campos novos são aditivos e ignorados pelo frontend.
 */

const { WIDGET_REGISTRY, listAllWidgets } = require('../../services/dashboardWidgetRegistry');
const {
  getPolicyFor,
  getWidgetCategory,
  getWidgetCapabilitiesRequired,
  getWidgetAxesOverlay
} = require('./granularityPolicy');
const { hasAllCapabilities } = require('../axes/capabilitiesDeriver');

/**
 * Pesos do score:
 *   axis_overlap_weight  : por eixo do widget que aparece nas axes_priority
 *   axis_priority_bonus  : axes[0] vale (PRIORITY_LEN); axes[1] vale (PRIORITY_LEN-1); etc.
 *   min_priority         : peso intrínseco do widget (definido no registry)
 *   granularity_bias     : do `granularityPolicy`
 *   max_widgets          : do `granularityPolicy`
 */
const AXIS_OVERLAP_WEIGHT = 4;
const PRIORITY_LEN_BASE = 5;
const PRIMARY_AXIS_BONUS = 5;
const CAPABILITY_UNLOCK_BONUS = 3;
const GENERALITY_PENALTY_THRESHOLD = 4; // >4 eixos totais começa a penalizar
const GENERALITY_PENALTY_PER_EIXO = 1;

function _scoreWidget(widgetId, axes, axesPriorityRanks, fnPolicy, unlockedAxes) {
  const def = WIDGET_REGISTRY[widgetId];
  if (!def) return null;
  const widgetAxes = Array.isArray(def.axes) ? def.axes.slice() : [];
  if (widgetAxes.length === 0) return null;

  // Overlay aditivo: a curadoria do produto vale tanto quanto o registry.
  const overlayAxes = getWidgetAxesOverlay(widgetId);
  const seen = new Set(widgetAxes);
  const effectiveAxes = widgetAxes.slice();
  for (const ax of overlayAxes) if (!seen.has(ax)) { effectiveAxes.push(ax); seen.add(ax); }

  let overlap = 0;
  let priorityBonus = 0;
  let primaryAxisBonus = 0;
  let unlockBonus = 0;
  const matchedAxes = [];
  for (const ax of effectiveAxes) {
    if (!axesPriorityRanks.has(ax)) continue;
    overlap += 1;
    const rank = axesPriorityRanks.get(ax);
    const isOverlay = overlayAxes.includes(ax) && !widgetAxes.includes(ax);
    const baseBonus = Math.max(0, PRIORITY_LEN_BASE - rank);
    priorityBonus += baseBonus;
    if (rank === 0) primaryAxisBonus = PRIMARY_AXIS_BONUS;
    if (unlockedAxes && unlockedAxes.has(ax)) unlockBonus += CAPABILITY_UNLOCK_BONUS;
    matchedAxes.push({ axis: ax, rank, bonus: baseBonus, source: isOverlay ? 'overlay' : 'registry' });
  }
  if (overlap === 0) return null;

  const minPriority = Number.isFinite(def.minPriority) ? def.minPriority : 5;
  const category = getWidgetCategory(widgetId);
  const granularityBias = (fnPolicy?.score_bias && Number.isFinite(fnPolicy.score_bias[category]))
    ? fnPolicy.score_bias[category]
    : 0;

  // Penalização de generalidade: widgets universais (pergunte_ia, insights_ia)
  // não devem dominar; menor especificidade reduz score.
  const totalAxes = effectiveAxes.length;
  const generalityPenalty = totalAxes > GENERALITY_PENALTY_THRESHOLD
    ? (totalAxes - GENERALITY_PENALTY_THRESHOLD) * GENERALITY_PENALTY_PER_EIXO
    : 0;

  const score =
    (overlap * AXIS_OVERLAP_WEIGHT) +
    minPriority +
    priorityBonus +
    granularityBias +
    primaryAxisBonus +
    unlockBonus -
    generalityPenalty;

  return {
    id: widgetId,
    score,
    axes: widgetAxes.slice(),
    overlay_axes: overlayAxes.slice(),
    matched_axes: matchedAxes,
    axis_overlap: overlap,
    axis_priority_bonus: priorityBonus,
    primary_axis_bonus: primaryAxisBonus,
    capability_unlock_bonus: unlockBonus,
    generality_penalty: generalityPenalty,
    min_priority: minPriority,
    category,
    granularity_bias: granularityBias
  };
}

function _composeRationale(scored, capCheck) {
  const parts = [];
  parts.push(`overlap=${scored.axis_overlap} eixos com prioridade do utilizador`);
  if (scored.matched_axes.length) {
    const axes = scored.matched_axes.map((m) => `${m.axis}(${m.source}, rank=${m.rank}, bonus=${m.bonus})`).join(', ');
    parts.push(`eixos_match: ${axes}`);
  }
  if (scored.primary_axis_bonus > 0) parts.push(`bonus_eixo_primario=+${scored.primary_axis_bonus}`);
  if (scored.capability_unlock_bonus > 0) parts.push(`bonus_capability_unlock=+${scored.capability_unlock_bonus}`);
  if (scored.generality_penalty > 0) parts.push(`penalidade_generalidade=-${scored.generality_penalty}`);
  parts.push(`min_priority=${scored.min_priority}`);
  parts.push(`bias_${scored.category}=${scored.granularity_bias > 0 ? '+' : ''}${scored.granularity_bias}`);
  if (capCheck.required.length === 0) parts.push('capabilities=N/A');
  else if (capCheck.ok) parts.push(`capabilities_ok=[${capCheck.required.join(',')}]`);
  else parts.push(`capabilities_missing=[${capCheck.missing.join(',')}]`);
  return parts.join(' | ');
}

function _checkCapabilities(widgetId, capabilities) {
  const required = getWidgetCapabilitiesRequired(widgetId);
  if (!required || required.length === 0) {
    return { required: [], ok: true, missing: [] };
  }
  const ok = hasAllCapabilities(capabilities, required);
  if (ok) return { required, ok: true, missing: [] };
  const set = new Set(Array.isArray(capabilities) ? capabilities : []);
  const missing = required.filter((c) => !set.has(c));
  return { required, ok: false, missing };
}

/**
 * Selecciona widgets para uma identidade contextual.
 *
 * @param {object} identity ContextualIdentity (ver identityResolver)
 * @returns {{
 *   widgets: Array<{
 *     id: string, posicao: number, tamanho: 'pequeno'|'medio'|'grande',
 *     prioridade: 'critica'|'alta'|'media',
 *     contexto: string,
 *     axes: string[], score: number,
 *     axis_overlap: number, axis_priority_bonus: number,
 *     min_priority: number, category: string,
 *     granularity_bias: number,
 *     capabilities_required: string[], capabilities_ok: boolean,
 *     rationale: string
 *   }>,
 *   denied: Array<{ id: string, reason: string, capabilities_missing: string[] }>,
 *   diagnostics: { axes_priority: string[], function_type: string, max_widgets: number }
 * }}
 */
function selectWidgets(identity) {
  const axes = Array.isArray(identity?.axes_priority) ? identity.axes_priority : [];
  const axesRanks = new Map();
  axes.forEach((ax, idx) => axesRanks.set(ax, idx));

  const fn = identity?.function_type || 'execucao';
  const fnPolicy = getPolicyFor(fn);
  const capabilities = Array.isArray(identity?.capabilities) ? identity.capabilities : [];
  const unlockedAxes = new Set(Array.isArray(identity?.unlocked_axes) ? identity.unlocked_axes : []);

  const denied = [];
  const scored = [];

  for (const widgetId of listAllWidgets()) {
    const s = _scoreWidget(widgetId, axes, axesRanks, fnPolicy, unlockedAxes);
    if (!s) continue; // sem overlap de eixos
    const cap = _checkCapabilities(widgetId, capabilities);
    if (!cap.ok) {
      denied.push({
        id: widgetId,
        reason: 'capabilities_missing',
        capabilities_required: cap.required,
        capabilities_missing: cap.missing
      });
      continue;
    }
    scored.push({ ...s, capabilities: cap });
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const maxN = Math.max(1, Number(fnPolicy?.max_widgets) || 10);
  const selected = scored.slice(0, maxN).map((w, idx) => {
    const isTop = idx < 2;
    const tamanho = isTop ? 'grande' : 'medio';
    const prioridade = idx < 2 ? 'critica' : idx < 5 ? 'alta' : 'media';
    return {
      id: w.id,
      posicao: idx + 1,
      tamanho,
      prioridade,
      contexto: identity?.primary_axis || axes[0] || 'eixo_operacional',
      axes: w.axes,
      overlay_axes: w.overlay_axes,
      score: w.score,
      axis_overlap: w.axis_overlap,
      axis_priority_bonus: w.axis_priority_bonus,
      primary_axis_bonus: w.primary_axis_bonus,
      capability_unlock_bonus: w.capability_unlock_bonus,
      generality_penalty: w.generality_penalty,
      min_priority: w.min_priority,
      category: w.category,
      granularity_bias: w.granularity_bias,
      capabilities_required: w.capabilities.required,
      capabilities_ok: true,
      rationale: _composeRationale(w, w.capabilities)
    };
  });

  // Garantir presença de pergunte_ia se cabível (universal). Mantém pacto
  // com `dashboardPersonalizationEngine.buildWidgetSet` legado.
  const hasAsk = selected.some((w) => w.id === 'pergunte_ia');
  const askDef = WIDGET_REGISTRY.pergunte_ia;
  if (!hasAsk && askDef && (askDef.axes || []).some((ax) => axesRanks.has(ax))) {
    selected.push({
      id: 'pergunte_ia',
      posicao: selected.length + 1,
      tamanho: 'medio',
      prioridade: 'alta',
      contexto: identity?.primary_axis || axes[0] || 'eixo_operacional',
      axes: askDef.axes,
      score: askDef.minPriority || 5,
      axis_overlap: 1,
      axis_priority_bonus: 0,
      min_priority: askDef.minPriority || 5,
      category: 'operational',
      granularity_bias: 0,
      capabilities_required: [],
      capabilities_ok: true,
      rationale: 'reserva universal: assistente IA sempre presente'
    });
  }

  return {
    widgets: selected,
    denied,
    diagnostics: {
      axes_priority: axes.slice(),
      primary_axis: axes[0] || null,
      function_type: fn,
      max_widgets: maxN,
      capabilities: capabilities.slice(),
      considered: scored.length,
      excluded_no_overlap: 0, // valor implícito; selectionados respeitam o filtro
      excluded_capabilities: denied.length
    }
  };
}

module.exports = { selectWidgets };
