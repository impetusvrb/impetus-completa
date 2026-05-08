'use strict';

/**
 * DashboardCompositionGateway — ponto único de composição de dashboard.
 *
 *   User → Gateway → Motor A (legacy)              ┐
 *                  └ Motor B (shadow ou primário)  ├─► resposta normalizada
 *                                                   │
 *                                                   └─► trace + diff
 *
 * Este gateway nunca lança. Em qualquer falha, devolve uma resposta
 * usando o que estiver disponível (com prioridade ao Motor A para
 * preservar comportamento actual). É 100% retrocompatível.
 *
 * Modos:
 *   off    → corre só Motor A (B não é nem chamado)
 *   shadow → A primário; B em paralelo (sample-rate); diff registado
 *   on     → B primário; A em background como fallback de segurança
 */

const crypto = require('crypto');
const { getFlags, shouldRunShadow, RAW_LEVELS, resolveEngineDirectiveForUser } = require('../flags');
const { composeFromMotorASync, composeFromMotorAAsync } = require('./motorAdapter');
const { composeDashboardV2 } = require('../composition/compositionEngine');
const { computeDiff } = require('./diffAnalyzer');
const { logTrace, logDiff, logError } = require('./traceLogger');
const { buildContextualIdentity } = require('../identity/identityResolver');
const decisionTrace = require('../observability/dashboardDecisionTrace');

function _now() { return Date.now(); }

function _generateTraceId(seed) {
  const base = `${Date.now()}_${seed || ''}_${crypto.randomBytes(4).toString('hex')}`;
  return crypto.createHash('sha1').update(base).digest('hex').slice(0, 16);
}

/**
 * Tenta executar `fn`. Captura síncrono e assíncrono. Nunca lança.
 */
async function _tryRun(fn, ctx) {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err, ctx };
  }
}

/**
 * Compõe o dashboard com a estratégia controlada por flags.
 *
 * @param {object} user req.user
 * @param {object} [opts]
 * @param {string} [opts.mode] override 'off'|'shadow'|'on' (testes)
 * @param {boolean} [opts.forceShadow] override do amostragem (testes)
 * @returns {Promise<{
 *   primary: object,         // saída do engine primário (já normalizada)
 *   shadow: object|null,     // saída do shadow se executado
 *   diff: object|null,       // diff A vs B se ambos correram
 *   engine: 'A'|'B'|'A_with_B_shadow',
 *   trace_id: string,
 *   latency_ms: number,
 *   flags_snapshot: object
 * }>}
 */
async function compose(user, opts) {
  const t0 = _now();
  const flags = getFlags();
  const traceId = _generateTraceId(user?.id);

  // Phase 3 — directiva granular: derivamos identidade preliminar para
  // decidir engine por área/função/empresa antes de executar Motor B.
  // Esta derivação é barata (sem DB) e o resultado é reusado na composição.
  let preliminaryIdentity = null;
  try {
    preliminaryIdentity = buildContextualIdentity(user || {});
  } catch (_) { preliminaryIdentity = null; }

  const directive = opts?.mode
    ? { mode: opts.mode, source: 'override', detail: {} }
    : resolveEngineDirectiveForUser({
        area: preliminaryIdentity?.area || null,
        functionType: preliminaryIdentity?.function_type || null,
        company_id: user?.company_id || null,
        user_id: user?.id || null
      });
  const mode = directive.mode; // off|shadow|on

  const primaryName = mode === RAW_LEVELS.on ? 'B' : 'A';
  const runShadow = (
    opts?.forceShadow === true ||
    mode === RAW_LEVELS.shadow ||
    (mode === RAW_LEVELS.on) // em 'on', A roda em background como redundância
  ) && (opts?.forceShadow === true || shouldRunShadow(flags, `${user?.id || ''}_${traceId}`));

  // 1) Engine primário
  let primary = null;
  let primaryError = null;
  if (primaryName === 'A') {
    const r = await _tryRun(() => composeFromMotorAAsync(user), 'motor_A_async');
    if (r.ok) {
      primary = r.value;
    } else {
      primaryError = r.error;
      // fallback síncrono
      try { primary = composeFromMotorASync(user); } catch (e) { primaryError = e; }
    }
  } else {
    const r = await _tryRun(() => composeDashboardV2(user, { traceId }), 'motor_B');
    if (r.ok) {
      primary = r.value;
    } else {
      primaryError = r.error;
      // safety net: cai para Motor A
      try { primary = await composeFromMotorAAsync(user); } catch (e) { primaryError = e; }
    }
  }

  // 2) Shadow / redundância
  let shadow = null;
  let diff = null;
  if (runShadow && primary) {
    if (primaryName === 'A') {
      const r = await _tryRun(() => composeDashboardV2(user, { traceId }), 'shadow_motor_B');
      if (r.ok) shadow = r.value;
      else logError({ flags, traceId, user, error: r.error, where: 'shadow_motor_B' });
    } else {
      const r = await _tryRun(() => composeFromMotorAAsync(user), 'shadow_motor_A');
      if (r.ok) shadow = r.value;
      else logError({ flags, traceId, user, error: r.error, where: 'shadow_motor_A' });
    }
    if (shadow) {
      try {
        diff = primaryName === 'A' ? computeDiff(primary, shadow) : computeDiff(shadow, primary);
        logDiff({ flags, traceId, user, diff });
      } catch (err) {
        logError({ flags, traceId, user, error: err, where: 'diff_analyzer' });
      }
    }
  }

  const latency = _now() - t0;
  const engineLabel = (primaryName === 'A' && runShadow && shadow)
    ? 'A_with_B_shadow'
    : (primaryName === 'B' && runShadow && shadow)
      ? 'B_with_A_shadow'
      : primaryName;

  // 3) Trace estruturado (NDJSON stdout)
  logTrace({
    flags,
    traceId,
    user,
    primaryEngine: primaryName,
    latencyMs: latency,
    normalized: primary,
    ranShadow: runShadow,
    error: primaryError,
    directive
  });

  const result = {
    primary,
    shadow,
    diff,
    engine: engineLabel,
    trace_id: traceId,
    latency_ms: latency,
    flags_snapshot: { v2: mode, shadow: flags.shadow, log: flags.logLevel },
    directive
  };

  // 4) Decision-trace em-memória (Phase 3) — auditável via API
  try { decisionTrace.record({ gatewayResult: result, user }); } catch (_) { /* silent */ }

  return result;
}

/**
 * Helper que devolve apenas a resposta primária — usado pelo `routes/dashboard.js`.
 * Mantém o pacto: a saída tem todos os campos esperados pelo frontend.
 */
async function composePrimary(user, opts) {
  const out = await compose(user, opts);
  return {
    payload: out.primary,
    meta: {
      engine: out.engine,
      trace_id: out.trace_id,
      latency_ms: out.latency_ms,
      directive: out.directive,
      diff_summary: out.diff
        ? {
            same_top_widget: out.diff.same_top_widget,
            jaccard: out.diff.jaccard_widgets,
            critical_divergence: out.diff.critical_divergence
          }
        : null
    }
  };
}

module.exports = {
  compose,
  composePrimary
};
