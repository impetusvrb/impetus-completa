'use strict';

/**
 * Contextual Overlay System
 *
 * Aplica overlays *invisíveis* sobre o `liveState` legacy do
 * `LiveDashboardUnifiedPanel`, sem alterar o JSX, o CSS ou as keys já
 * consumidas pelo frontend. Apenas troca/insere os valores **dentro**
 * dos campos já existentes:
 *
 *   - `layout.widgets[]`           ← composição por Motor B
 *   - `personalization.gaps[]`     ← merge com gaps contextuais
 *   - `personalization.user_message` ← variante contextual quando aplicável
 *   - `personalization.profile_label` ← reforça label V2 (sem mudar code)
 *
 * Modos suportados:
 *   - 'shadow'  → calcula tudo, mas **devolve o legacy intocado** (apenas
 *                 grava metadata em `_contextual_meta` que NÃO é lido pelo
 *                 frontend; serve para telemetria/diff).
 *   - 'enrich'  → mantém widgets do legacy, mas adiciona contexto a `gaps`
 *                 e `personalization_overlay`.
 *   - 'replace' → substitui `layout.widgets` pelos do Motor B (ainda em
 *                 contrato legacy). Mantém o resto.
 *
 * Garantias absolutas:
 *   1. NUNCA muda nomes/keys do JSON externo.
 *   2. NUNCA remove campos que o JSX consome.
 *   3. SE algo lança, devolve `legacyState` intocado.
 *   4. NÃO modifica `legacyState` por referência — produz cópia rasa.
 */

const resolver = require('./contextualDashboardResolver');

const MODE = Object.freeze({
  SHADOW: 'shadow',
  ENRICH: 'enrich',
  REPLACE: 'replace'
});

function _safeArray(x) { return Array.isArray(x) ? x.slice() : []; }

/**
 * Aplica overlay no `legacyState` segundo o modo.
 *
 * @param {object} legacyState   resultado de `buildLiveStateForUser`
 * @param {object} user
 * @param {object} [opts]
 * @param {'shadow'|'enrich'|'replace'} [opts.mode='shadow']
 * @param {object} [opts.kpiByKey]  mapa para alimentar live_metric
 * @returns {{ state: object, meta: object }}
 */
function applyContextualOverlay(legacyState, user, opts = {}) {
  const mode = opts.mode || MODE.SHADOW;
  const meta = {
    mode,
    applied: false,
    widgets_replaced: false,
    gaps_added: 0,
    trace_id: null,
    function_type: null,
    primary_axis: null,
    error: null
  };

  if (!legacyState || legacyState.ok === false) return { state: legacyState, meta };

  let resolved = null;
  try {
    resolved = resolver.resolveContextualDashboard(user, { kpiByKey: opts.kpiByKey || {} }, {
      traceId: opts.traceId,
      maxWidgets: opts.maxWidgets
    });
  } catch (err) {
    meta.error = err && err.message ? err.message : 'resolver_failed';
    return { state: legacyState, meta };
  }
  if (!resolved) return { state: legacyState, meta };

  meta.trace_id = resolved.trace_id || null;
  meta.function_type = resolved.personalization_overlay?.function_type || null;
  meta.primary_axis = resolved.personalization_overlay?.primary_axis || null;

  // Modo SHADOW — devolve o legacy original; meta serve telemetria/diff
  if (mode === MODE.SHADOW) {
    meta.applied = false;
    meta.shadow_widgets_count = resolved.widgets.length;
    meta.shadow_widget_ids = resolved.widgets.map((w) => w.id);
    return { state: legacyState, meta };
  }

  // Cópia rasa para não mutar o objeto original
  const next = { ...legacyState };
  next.layout = legacyState.layout ? { ...legacyState.layout } : { widgets: [] };
  next.personalization = legacyState.personalization ? { ...legacyState.personalization } : null;

  if (mode === MODE.REPLACE) {
    if (Array.isArray(resolved.widgets) && resolved.widgets.length > 0) {
      next.layout.widgets = resolved.widgets;
      meta.widgets_replaced = true;
    }
  }

  // Gaps contextuais sempre são adicionados (em ambos enrich/replace)
  if (next.personalization && Array.isArray(resolved.gaps) && resolved.gaps.length > 0) {
    const existing = _safeArray(next.personalization.gaps);
    const merged = [...existing];
    for (const g of resolved.gaps) {
      if (typeof g === 'string' && !merged.includes(g)) merged.push(g);
    }
    meta.gaps_added = merged.length - existing.length;
    next.personalization.gaps = merged;
  }

  // Overlay de personalização — campo NOVO `personalization_overlay`. NÃO é
  // consumido pelo JSX actual (frontend ignora chaves desconhecidas), mas
  // fica disponível para painéis administrativos e governança.
  if (resolved.personalization_overlay) {
    next.personalization_overlay = { ...(legacyState.personalization_overlay || {}), ...resolved.personalization_overlay };
  }

  meta.applied = true;
  return { state: next, meta };
}

module.exports = {
  MODE,
  applyContextualOverlay
};
