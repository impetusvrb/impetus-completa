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

// Enterprise Hardening Bloco 5 (C10):
//   Estado original — global. Aditivamente passamos a manter buckets por tenant
//   quando IMPETUS_CONTEXTUAL_BREAKER_PER_TENANT=true. Em produção, este modo
//   evita que um tenant com falhas patológicas abra o circuito para todos os
//   restantes (cross-tenant degradation).
//
//   Comportamento padrão (per_tenant=false) mantém-se idêntico ao legado.

const FAILURES = []; // { ts, where }  ← legacy global bucket
/** @type {Map<string, Array<{ts:number, where:string}>>} */
const FAILURES_BY_TENANT = new Map();
let _manualForceFallback = false;
const _manualForceFallbackByTenant = new Map();

function _perTenantEnabled() {
  return String(process.env.IMPETUS_CONTEXTUAL_BREAKER_PER_TENANT || 'false').toLowerCase() === 'true';
}

function _bucketFor(tenantId) {
  if (!tenantId) return FAILURES; // fallback para legacy global
  const key = String(tenantId);
  let arr = FAILURES_BY_TENANT.get(key);
  if (!arr) {
    arr = [];
    FAILURES_BY_TENANT.set(key, arr);
  }
  return arr;
}

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

function _pruneArr(arr, now) {
  const cutoff = now - _windowMs();
  while (arr.length && arr[0].ts < cutoff) arr.shift();
}

function _prune(now) {
  _pruneArr(FAILURES, now);
  if (_perTenantEnabled()) {
    for (const arr of FAILURES_BY_TENANT.values()) _pruneArr(arr, now);
  }
}

function recordFailure(where, tenantId) {
  const now = Date.now();
  const arr = _perTenantEnabled() ? _bucketFor(tenantId) : FAILURES;
  arr.push({ ts: now, where: String(where || 'unknown') });
  _pruneArr(arr, now);
}

function recordSuccess() {
  // não decrementa para evitar oscilações; só a janela cura.
}

function isCircuitOpen(tenantId) {
  const now = Date.now();
  if (_perTenantEnabled() && tenantId) {
    const arr = _bucketFor(tenantId);
    _pruneArr(arr, now);
    return arr.length >= _threshold();
  }
  _pruneArr(FAILURES, now);
  return FAILURES.length >= _threshold();
}

function getCircuitState(tenantId) {
  const now = Date.now();
  if (_perTenantEnabled() && tenantId) {
    const arr = _bucketFor(tenantId);
    _pruneArr(arr, now);
    return {
      mode: 'per_tenant',
      tenant_id: String(tenantId),
      open: arr.length >= _threshold(),
      failures_in_window: arr.length,
      threshold: _threshold(),
      window_ms: _windowMs(),
      last_failures: arr.slice(-5)
    };
  }
  _pruneArr(FAILURES, now);
  return {
    mode: 'global',
    open: FAILURES.length >= _threshold(),
    failures_in_window: FAILURES.length,
    threshold: _threshold(),
    window_ms: _windowMs(),
    last_failures: FAILURES.slice(-5)
  };
}

function manualForceFallback(active, tenantId) {
  if (_perTenantEnabled() && tenantId) {
    _manualForceFallbackByTenant.set(String(tenantId), active === true);
    return active === true;
  }
  _manualForceFallback = active === true;
  return _manualForceFallback;
}

function isManualFallback(tenantId) {
  if (_perTenantEnabled() && tenantId && _manualForceFallbackByTenant.has(String(tenantId))) {
    return _manualForceFallbackByTenant.get(String(tenantId)) === true;
  }
  return _manualForceFallback === true;
}

/**
 * Resolve o modo final, considerando flags + circuit + fallback manual.
 *
 * @param {object} args { area, function_type, company_id, user_id, validator }
 * @returns {{mode:'off'|'shadow'|'enrich'|'replace', reason:string, source:string, detail:object}}
 */
function resolveMode(args) {
  const tenantId = args && (args.company_id || args.companyId);
  if (isManualFallback(tenantId)) {
    return { mode: 'off', reason: 'manual_fallback', source: 'manual', detail: { tenant_id: tenantId || null } };
  }
  if (isCircuitOpen(tenantId)) {
    return { mode: 'off', reason: 'circuit_open', source: 'circuit', detail: getCircuitState(tenantId) };
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
  FAILURES_BY_TENANT.clear();
  _manualForceFallback = false;
  _manualForceFallbackByTenant.clear();
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
