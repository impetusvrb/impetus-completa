'use strict';

/**
 * WAVE 2 — propagação de correlation / trace / workflow via AsyncLocalStorage.
 */

const { AsyncLocalStorage } = require('async_hooks');
const { isCorrelationPropagationEnabled, isObservabilityV2Enabled } = require('./observabilityFlags');

const _als = new AsyncLocalStorage();

const EMPTY = Object.freeze({
  correlation_id: null,
  trace_id: null,
  causation_id: null,
  workflow_id: null,
  company_id: null
});

function _sanitizeHeader(raw, maxLen = 128) {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, maxLen);
  return /^[a-zA-Z0-9._:-]{4,128}$/.test(s) ? s : null;
}

/**
 * @param {import('express').Request} req
 */
function bindFromRequest(req) {
  if (!isObservabilityV2Enabled() || !isCorrelationPropagationEnabled()) return;
  if (!req || typeof req !== 'object') return;

  const correlationId =
    _sanitizeHeader(req.headers['x-correlation-id']) ||
    _sanitizeHeader(req.headers['x-request-id']) ||
    (req.id != null ? String(req.id) : null);
  const traceId =
    _sanitizeHeader(req.headers['x-trace-id']) ||
    _sanitizeHeader(req.headers['x-ai-trace-id']) ||
    correlationId;
  const workflowId = _sanitizeHeader(req.headers['x-workflow-id']);
  const causationId = _sanitizeHeader(req.headers['x-causation-id']);
  const companyId =
    req.user && req.user.company_id != null
      ? String(req.user.company_id)
      : req.headers['x-company-id']
        ? _sanitizeHeader(req.headers['x-company-id'], 64)
        : null;

  const ctx = {
    correlation_id: correlationId,
    trace_id: traceId,
    causation_id: causationId,
    workflow_id: workflowId,
    company_id: companyId
  };

  req.observabilityContext = ctx;
}

function getContext() {
  const store = _als.getStore();
  if (store) return { ...store };
  if (!isObservabilityV2Enabled()) return { ...EMPTY };
  return { ...EMPTY };
}

/**
 * @param {object} partial
 * @param {() => any} fn
 */
function runWithContext(partial, fn) {
  if (!isObservabilityV2Enabled()) return fn();
  const parent = getContext();
  const merged = Object.assign({}, parent, partial || {});
  return _als.run(merged, fn);
}

/**
 * Headers para chamadas downstream.
 */
function propagationHeaders() {
  const ctx = getContext();
  const h = {};
  if (ctx.correlation_id) h['X-Correlation-Id'] = ctx.correlation_id;
  if (ctx.trace_id) {
    h['X-Trace-Id'] = ctx.trace_id;
    h['X-AI-Trace-Id'] = ctx.trace_id;
  }
  if (ctx.causation_id) h['X-Causation-Id'] = ctx.causation_id;
  if (ctx.workflow_id) h['X-Workflow-Id'] = ctx.workflow_id;
  return h;
}

/**
 * Enriquece envelope industrial com contexto HTTP actual.
 */
function enrichIndustrialEnvelope(partial) {
  const ctx = getContext();
  if (!ctx.correlation_id && !ctx.trace_id) return partial;
  return Object.assign({}, partial, {
    correlation_id: partial.correlation_id || ctx.correlation_id,
    trace_id: partial.trace_id || ctx.trace_id,
    causation_id: partial.causation_id || ctx.causation_id,
    workflow_id: partial.workflow_id || ctx.workflow_id,
    metadata: Object.assign({}, partial.metadata || {}, {
      http_correlation_id: ctx.correlation_id
    })
  });
}

module.exports = {
  bindFromRequest,
  getContext,
  runWithContext,
  propagationHeaders,
  enrichIndustrialEnvelope
};
