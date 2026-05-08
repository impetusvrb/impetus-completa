'use strict';

/**
 * PromotionGuard
 *
 * Decide o modo de promoção do Motor B sobre o `liveDashboardService`,
 * por utilizador, sem alterar o output visual do frontend.
 *
 * Estratégia:
 *   1. Lê flags de ambiente granulares (mesmo padrão do Phase 3 +
 *      novas dedicadas ao live panel).
 *   2. Reusa `flags.resolveEngineDirectiveForUser` para coerência com o
 *      resto da arquitectura.
 *   3. Aplica circuit-breaker em memória: se a taxa de falha do validator
 *      ultrapassar `IMPETUS_LIVE_PROMOTION_FAILURE_THRESHOLD` (default 0.25)
 *      em janela `IMPETUS_LIVE_PROMOTION_FAILURE_WINDOW` (default 50),
 *      desliga `replace` e cai para `shadow`/`legacy` automaticamente.
 *   4. Rollback instantâneo: chamar `forceFallback(reason)` põe o motor em
 *      'legacy' até `clearForceFallback()`.
 *
 * Modos retornados:
 *   - 'legacy'  — desligado; motor A puro
 *   - 'shadow'  — calcula contexto, devolve legacy
 *   - 'enrich'  — adiciona gaps/overlay sem mudar layout
 *   - 'replace' — substitui `layout.widgets` pelos do Motor B (ainda em
 *                 contrato legacy)
 */

const flags = require('../dashboardEngineV2/flags');

const DEFAULT_FAILURE_THRESHOLD = 0.25;
const DEFAULT_FAILURE_WINDOW = 50;
const DEFAULT_MIN_TRUST = 60;

// Estado em memória — reset a cada restart, propositadamente
const _state = {
  forced_fallback: false,
  forced_reason: null,
  recent_results: [], // { ok, score, ts }
};

function _readFlag(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return fallback;
  return String(v).toLowerCase().trim();
}

function _readNum(name, fallback) {
  const v = Number(process.env[name]);
  if (!Number.isFinite(v)) return fallback;
  return v;
}

function forceFallback(reason) {
  _state.forced_fallback = true;
  _state.forced_reason = reason || 'manual';
}
function clearForceFallback() {
  _state.forced_fallback = false;
  _state.forced_reason = null;
}
function isForcedFallback() {
  return { forced: _state.forced_fallback, reason: _state.forced_reason };
}
function reset() {
  _state.forced_fallback = false;
  _state.forced_reason = null;
  _state.recent_results = [];
}

/**
 * Regista o resultado da última execução (para o circuit-breaker).
 * Chamado pelo `index.js` após cada validação.
 */
function recordResult({ ok, score }) {
  const entry = { ok: !!ok, score: Number.isFinite(score) ? score : 0, ts: Date.now() };
  _state.recent_results.push(entry);
  const window = Math.max(10, Math.min(500, _readNum('IMPETUS_LIVE_PROMOTION_FAILURE_WINDOW', DEFAULT_FAILURE_WINDOW)));
  if (_state.recent_results.length > window) {
    _state.recent_results = _state.recent_results.slice(-window);
  }
}

function _circuitBreakerActive() {
  const window = Math.max(10, Math.min(500, _readNum('IMPETUS_LIVE_PROMOTION_FAILURE_WINDOW', DEFAULT_FAILURE_WINDOW)));
  if (_state.recent_results.length < Math.min(10, window)) return false;
  const threshold = _readNum('IMPETUS_LIVE_PROMOTION_FAILURE_THRESHOLD', DEFAULT_FAILURE_THRESHOLD);
  const failures = _state.recent_results.filter((r) => !r.ok).length;
  const rate = failures / _state.recent_results.length;
  return rate >= threshold;
}

/**
 * Resolve o modo a usar para `user`, respeitando hierarquia de regras:
 *
 *   1. Forced fallback (rollback manual)         → 'legacy'
 *   2. Circuit breaker activo (taxa de falhas)   → 'shadow'  (contexto silencioso)
 *   3. Flag global IMPETUS_LIVE_DASHBOARD_MOTOR  → respeitada
 *   4. Directiva por área/função/empresa via Phase 3 flags
 *   5. Default: 'legacy'
 *
 * @param {object} user
 * @returns {{ mode: 'legacy'|'shadow'|'enrich'|'replace', source: string, reason?: string, directive?: object }}
 */
function decideMode(user) {
  if (_state.forced_fallback) {
    return { mode: 'legacy', source: 'forced_fallback', reason: _state.forced_reason };
  }
  if (_circuitBreakerActive()) {
    return { mode: 'shadow', source: 'circuit_breaker', reason: 'failure_rate_above_threshold' };
  }

  // Flag global dedicada ao painel ao vivo (mais específica que IMPETUS_DASHBOARD_ENGINE_V2)
  const globalLive = _readFlag('IMPETUS_LIVE_DASHBOARD_MOTOR', null);
  if (globalLive && ['legacy', 'shadow', 'enrich', 'replace'].includes(globalLive)) {
    return { mode: globalLive, source: 'global_live_flag' };
  }

  // Reusa a Phase 3 (área/função/empresa/percentual) para coerência
  let directive = { mode: 'off', source: 'global_v2' };
  try {
    const fn = user?.function_type || null;
    const area = user?.functional_area || null;
    directive = flags.resolveEngineDirectiveForUser({
      area,
      functionType: fn,
      user_id: user?.id,
      company_id: user?.company_id
    });
  } catch (_) {
    /* tolerante */
  }

  // Mapeia directiva → modo do live panel:
  //   'off'    → 'legacy'  (motor A puro)
  //   'shadow' → 'shadow'  (contexto calculado, mas devolve legacy)
  //   'on'     → 'enrich'  (default seguro: enriquece gaps; NÃO substitui)
  if (directive.mode === 'on') {
    // Promoção total opt-in: precisa de flag dedicada
    const allowReplace = _readFlag('IMPETUS_LIVE_DASHBOARD_REPLACE_ON_ON', 'false') === 'true';
    return { mode: allowReplace ? 'replace' : 'enrich', source: directive.source, directive };
  }
  if (directive.mode === 'shadow') {
    return { mode: 'shadow', source: directive.source, directive };
  }
  return { mode: 'legacy', source: directive.source || 'default_off', directive };
}

function getCircuitState() {
  const window = Math.max(10, Math.min(500, _readNum('IMPETUS_LIVE_PROMOTION_FAILURE_WINDOW', DEFAULT_FAILURE_WINDOW)));
  const failures = _state.recent_results.filter((r) => !r.ok).length;
  return {
    open: _circuitBreakerActive(),
    forced_fallback: _state.forced_fallback,
    forced_reason: _state.forced_reason,
    sample_size: _state.recent_results.length,
    failures,
    failure_rate: _state.recent_results.length > 0 ? failures / _state.recent_results.length : 0,
    threshold: _readNum('IMPETUS_LIVE_PROMOTION_FAILURE_THRESHOLD', DEFAULT_FAILURE_THRESHOLD),
    window,
    min_trust: _readNum('IMPETUS_LIVE_PROMOTION_MIN_TRUST', DEFAULT_MIN_TRUST)
  };
}

module.exports = {
  decideMode,
  recordResult,
  forceFallback,
  clearForceFallback,
  isForcedFallback,
  getCircuitState,
  reset
};
