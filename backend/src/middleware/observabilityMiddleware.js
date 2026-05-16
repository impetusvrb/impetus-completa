'use strict';

/**
 * WAVE 2 — middleware HTTP: propagação de correlation + métricas low-overhead.
 */

const flags = require('../observability/observabilityFlags');
const correlationContext = require('../observability/correlationContext');

function observabilityMiddleware(req, res, next) {
  if (!flags.isObservabilityV2Enabled()) return next();

  const correlationId =
    req.id ||
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    null;
  const traceId = req.headers['x-trace-id'] || req.headers['x-ai-trace-id'] || correlationId;
  const workflowId = req.headers['x-workflow-id'] || null;
  const companyId = req.user && req.user.company_id != null ? String(req.user.company_id) : null;

  const ctx = {
    correlation_id: correlationId != null ? String(correlationId) : null,
    trace_id: traceId != null ? String(traceId) : null,
    causation_id: req.headers['x-causation-id'] || null,
    workflow_id: workflowId != null ? String(workflowId) : null,
    company_id: companyId
  };

  req.observabilityContext = ctx;

  if (flags.isCorrelationPropagationEnabled()) {
    correlationContext.bindFromRequest(req);
  }

  const t0 = Date.now();
  res.on('finish', () => {
    try {
      const runtime = require('../observability/enterpriseObservabilityV2Runtime');
      runtime.recordHttpObservability(req, res, Date.now() - t0);
    } catch (_e) {}
  });

  return correlationContext.runWithContext(ctx, () => next());
}

module.exports = { observabilityMiddleware };
