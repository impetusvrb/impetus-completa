'use strict';

const { runWithRequestContext } = require('../services/requestAsyncContext');

/**
 * Propaga classificação + modo degradado HEAVY para AsyncLocalStorage (inclui await).
 */
function impetusAsyncContextBindMiddleware(req, res, next) {
  runWithRequestContext(
    {
      requestClass: req.impetusRequestClass || 'NORMAL',
      degradedMode: !!req.degradedMode,
      originalHeavyClass: req.impetusOriginalRequestClass || null,
      costScore: typeof req.impetusRequestCostScore === 'number' ? req.impetusRequestCostScore : 0,
      trace_id: req.headers['x-ai-trace-id'] || req.headers['x-request-id'] || undefined,
      request_id: req.headers['x-request-id'] || undefined,
      geminiIngress: req.geminiContext !== undefined ? req.geminiContext : null
    },
    () => next()
  );
}

module.exports = { impetusAsyncContextBindMiddleware };
