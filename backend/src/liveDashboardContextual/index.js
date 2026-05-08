'use strict';

/**
 * liveDashboardContextual — façade
 *
 * Ponto único de integração para o `liveDashboardService`.
 *
 *   const { enhanceLiveStateWithContext } = require('../liveDashboardContextual');
 *   const enhanced = await enhanceLiveStateWithContext(legacyState, user, { kpiByKey });
 *
 * Garantias:
 *   - Se Motor B desligado / em fallback / em erro → devolve `legacyState`
 *     intocado (sem `_contextual_meta`).
 *   - Quando aplicado em `enrich`/`replace`, **mantém todas as keys** que o
 *     frontend já lê. Apenas adiciona `personalization_overlay` (chave
 *     desconhecida pelo JSX actual, ignorada).
 *   - Em `shadow`, calcula tudo, devolve legacy intacto, e regista em
 *     telemetria + circuit breaker.
 */

const overlay = require('./contextualOverlay');
const validator = require('./experienceValidator');
const promotion = require('./promotionGuard');
const telemetry = require('./experienceTelemetry');

function _hrtimeMsSince(start) {
  if (!start) return null;
  const [s, ns] = process.hrtime(start);
  return Math.round((s * 1000 + ns / 1e6) * 100) / 100;
}

/**
 * Aplica a camada contextual sobre o `legacyState`.
 *
 * @param {object} legacyState   resultado de `buildLiveStateForUser`
 * @param {object} user          `req.user`
 * @param {object} [opts]
 * @param {object} [opts.kpiByKey]
 * @param {number} [opts.legacyLatencyMs]   latência da composição legacy (para telemetria)
 * @param {string} [opts.traceId]
 * @returns {{ state: object, meta: object }}
 */
function enhanceLiveStateWithContext(legacyState, user, opts = {}) {
  const meta = {
    enabled: false,
    mode: 'legacy',
    source: 'default',
    fallback_triggered: false,
    fallback_reason: null,
    validator: null,
    latency_contextual_ms: null,
    trace_id: null
  };

  if (!legacyState || legacyState.ok === false) {
    return { state: legacyState, meta };
  }

  const decision = promotion.decideMode(user);
  meta.mode = decision.mode;
  meta.source = decision.source;
  meta.directive = decision.directive || null;

  if (decision.mode === 'legacy') {
    return { state: legacyState, meta };
  }

  meta.enabled = true;
  const t0 = process.hrtime();
  let overlayResult;
  try {
    overlayResult = overlay.applyContextualOverlay(legacyState, user, {
      mode: decision.mode,
      kpiByKey: opts.kpiByKey,
      traceId: opts.traceId
    });
  } catch (err) {
    meta.fallback_triggered = true;
    meta.fallback_reason = `overlay_error:${err && err.message ? err.message : 'unknown'}`;
    promotion.recordResult({ ok: false, score: 0 });
    telemetry.record({
      user_id: user?.id, company_id: user?.company_id,
      mode: decision.mode, engine: 'A',
      legacy_widget_ids: (legacyState?.layout?.widgets || []).map((w) => w?.id).filter(Boolean),
      contextual_widget_ids: [],
      validator: { ok: false, score: 0, issues: [{ severity: 'high', kind: 'overlay_error', detail: meta.fallback_reason }] },
      latency_legacy_ms: opts.legacyLatencyMs ?? null,
      latency_contextual_ms: _hrtimeMsSince(t0),
      fallback_triggered: true,
      fallback_reason: meta.fallback_reason
    });
    return { state: legacyState, meta };
  }
  meta.latency_contextual_ms = _hrtimeMsSince(t0);
  meta.trace_id = overlayResult.meta?.trace_id || null;

  // Validação da experiência produzida
  const widgetsForValidation = decision.mode === 'replace'
    ? (overlayResult.state?.layout?.widgets || [])
    : (overlayResult.meta?.shadow_widget_ids || []).map((id) => ({ id }));
  const verdict = validator.validateExperience({ user, widgets: widgetsForValidation });
  meta.validator = verdict;
  promotion.recordResult({ ok: verdict.ok, score: verdict.score });

  // Fallback automático em REPLACE: se a experiência B é insegura, devolve legacy
  if (decision.mode === 'replace' && !verdict.ok) {
    meta.fallback_triggered = true;
    meta.fallback_reason = 'validator_failed';
    telemetry.record({
      user_id: user?.id, company_id: user?.company_id,
      mode: 'replace', engine: 'A',
      function_type: overlayResult.meta?.function_type,
      primary_axis: overlayResult.meta?.primary_axis,
      legacy_widget_ids: (legacyState?.layout?.widgets || []).map((w) => w?.id).filter(Boolean),
      contextual_widget_ids: widgetsForValidation.map((w) => w?.id).filter(Boolean),
      validator: verdict,
      latency_legacy_ms: opts.legacyLatencyMs ?? null,
      latency_contextual_ms: meta.latency_contextual_ms,
      fallback_triggered: true,
      fallback_reason: meta.fallback_reason
    });
    return { state: legacyState, meta };
  }

  // Caminho feliz — devolve estado enriquecido (ou legacy em shadow)
  telemetry.record({
    user_id: user?.id, company_id: user?.company_id,
    mode: decision.mode,
    engine: decision.mode === 'replace' ? 'B' : 'A_with_B_shadow',
    function_type: overlayResult.meta?.function_type,
    primary_axis: overlayResult.meta?.primary_axis,
    legacy_widget_ids: (legacyState?.layout?.widgets || []).map((w) => w?.id).filter(Boolean),
    contextual_widget_ids: widgetsForValidation.map((w) => w?.id).filter(Boolean),
    validator: verdict,
    latency_legacy_ms: opts.legacyLatencyMs ?? null,
    latency_contextual_ms: meta.latency_contextual_ms
  });

  return { state: overlayResult.state, meta };
}

module.exports = {
  enhanceLiveStateWithContext,
  promotion,
  telemetry,
  validator,
  overlay
};
