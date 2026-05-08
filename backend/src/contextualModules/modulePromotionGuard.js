'use strict';

/**
 * ModulePromotionGuard (Phase 6, Part 8)
 * --------------------------------------
 * Decide o modo final de promoção dos módulos contextuais para uma
 * resolução, com circuit-breaker e fallback manual instantâneo.
 *
 *   - flags granulares (moduleFlags.resolveDirectiveForUser)
 *   - circuit-breaker em janela móvel: N falhas em M ms → abre circuito
 *   - manualForceFallback() / clearManualForceFallback() para rollback
 */

const flagsLib = require('./moduleFlags');

const FAILURES = []; // { ts, where }
let _manualForceFallback = false;

function _windowMs() {
  const v = Number(process.env.IMPETUS_CONTEXTUAL_MODULES_FAILURE_WINDOW_MS);
  return Number.isFinite(v) && v > 0 ? v : 60_000;
}

function _threshold() {
  const v = Number(process.env.IMPETUS_CONTEXTUAL_MODULES_FAILURE_THRESHOLD);
  return Number.isFinite(v) && v >= 1 ? Math.round(v) : 5;
}

function _minTrust() {
  const v = Number(process.env.IMPETUS_CONTEXTUAL_MODULES_MIN_TRUST);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.4;
}

function _prune(now) {
  const cutoff = now - _windowMs();
  while (FAILURES.length && FAILURES[0].ts < cutoff) FAILURES.shift();
}

function recordFailure(where) {
  const now = Date.now();
  FAILURES.push({ ts: now, where: String(where || 'unknown') });
  _prune(now);
}

function recordSuccess() {
  // não decrementa para evitar oscilações; só a janela cura.
}

function isCircuitOpen() {
  _prune(Date.now());
  return FAILURES.length >= _threshold();
}

function getCircuitState() {
  _prune(Date.now());
  return {
    open: FAILURES.length >= _threshold(),
    failures_in_window: FAILURES.length,
    threshold: _threshold(),
    window_ms: _windowMs(),
    last_failures: FAILURES.slice(-5)
  };
}

function manualForceFallback(active) {
  _manualForceFallback = active === true;
  return _manualForceFallback;
}

function isManualFallback() {
  return _manualForceFallback === true;
}

/**
 * Resolve o modo final, considerando flags + circuit + fallback manual.
 *
 * @param {object} args { area, function_type, company_id, user_id, validator }
 * @returns {{mode:'off'|'shadow'|'enrich'|'replace', reason:string, source:string, detail:object}}
 */
function resolveMode(args) {
  if (isManualFallback()) {
    return { mode: 'off', reason: 'manual_fallback', source: 'manual', detail: {} };
  }
  if (isCircuitOpen()) {
    return { mode: 'off', reason: 'circuit_open', source: 'circuit', detail: getCircuitState() };
  }
  const directive = flagsLib.resolveDirectiveForUser(args);
  // Se há validator e o trust é baixo em modo replace, downgrade para enrich.
  if (args && args.validator && directive.mode === 'replace') {
    const trust = Number(args.validator.trust_score);
    if (Number.isFinite(trust) && trust < _minTrust()) {
      return { mode: 'enrich', reason: 'low_trust_downgrade', source: 'guard', detail: { trust, min: _minTrust() } };
    }
  }
  return { mode: directive.mode, reason: 'flags', source: directive.source, detail: directive.detail };
}

function reset() {
  FAILURES.length = 0;
  _manualForceFallback = false;
}

module.exports = {
  recordFailure,
  recordSuccess,
  isCircuitOpen,
  getCircuitState,
  manualForceFallback,
  isManualFallback,
  resolveMode,
  reset
};
