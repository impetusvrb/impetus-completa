'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * @param {{
 *   requestClass?: string,
 *   degradedMode?: boolean,
 *   originalHeavyClass?: string|null,
 *   costScore?: number,
 *   geminiIngress?: object|null
 * }} store
 * @param {() => void} fn
 */
function runWithRequestContext(store, fn) {
  const merged = {
    requestClass: (store && store.requestClass) || 'NORMAL',
    degradedMode: !!(store && store.degradedMode),
    originalHeavyClass:
      store && store.originalHeavyClass != null ? String(store.originalHeavyClass) : null,
    costScore: typeof store?.costScore === 'number' ? store.costScore : 0,
    trace_id:
      store && store.trace_id != null
        ? String(store.trace_id)
        : store && store.traceId != null
          ? String(store.traceId)
          : undefined,
    request_id:
      store && store.request_id != null
        ? String(store.request_id)
        : store && store.requestId != null
          ? String(store.requestId)
          : undefined,
    geminiIngress: store && store.geminiIngress !== undefined ? store.geminiIngress : null
  };
  return asyncLocalStorage.run(merged, fn);
}

/**
 * @returns {'CRITICAL'|'NORMAL'|'HEAVY'}
 */
function getRequestClass() {
  const s = asyncLocalStorage.getStore();
  const c = s && s.requestClass ? String(s.requestClass).toUpperCase() : 'NORMAL';
  if (c === 'CRITICAL' || c === 'HEAVY') return c;
  return 'NORMAL';
}

function getAdaptiveContext() {
  const s = asyncLocalStorage.getStore();
  return {
    requestClass: getRequestClass(),
    degradedMode: !!(s && s.degradedMode),
    originalHeavyClass: s && s.originalHeavyClass,
    costScore: s && typeof s.costScore === 'number' ? s.costScore : 0,
    geminiIngress: s && s.geminiIngress ? s.geminiIngress : null
  };
}

/** Contexto do middleware geminiIngress (modo passthrough / light / full). */
function getGeminiIngress() {
  const s = asyncLocalStorage.getStore();
  return s && s.geminiIngress ? s.geminiIngress : null;
}

module.exports = {
  asyncLocalStorage,
  runWithRequestContext,
  getRequestClass,
  getAdaptiveContext,
  getGeminiIngress
};
