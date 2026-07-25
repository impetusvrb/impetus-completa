'use strict';

const { ENTITY_TYPES } = require('../compatibility/contracts/canonicalContracts');

function apiOk(res, { contract, data, meta = {}, status = 200 }) {
  return res.status(status).json({
    ok: true,
    phase: 'WMS-003',
    contract,
    data,
    meta: {
      routing: meta.routing || data?._routing || null,
      source: meta.source || data?._source || null,
      adapter: meta.adapter || null,
      fallback: meta.fallback === true
    }
  });
}

function apiError(res, status, error, extra = {}) {
  return res.status(status).json({ ok: false, phase: 'WMS-003', error, ...extra });
}

function tenantId(req, res) {
  const companyId = req.user?.company_id;
  if (!companyId) {
    apiError(res, 403, 'tenant required');
    return null;
  }
  return companyId;
}

function wrapController(fn, { contract }) {
  return async (req, res) => {
    const t0 = Date.now();
    const { logWmsApiEvent } = require('../shared/wmsApiObservability');
    try {
      await fn(req, res, { apiOk, apiError, tenantId, contract });
      logWmsApiEvent({
        method: req.method,
        path: req.originalUrl || req.path,
        status: res.statusCode || 200,
        duration_ms: Date.now() - t0,
        contract
      });
    } catch (err) {
      logWmsApiEvent({
        method: req.method,
        path: req.originalUrl || req.path,
        status: 500,
        duration_ms: Date.now() - t0,
        contract,
        error: err.message
      });
      if (!res.headersSent) apiError(res, 500, err.message);
    }
  };
}

module.exports = {
  apiOk,
  apiError,
  tenantId,
  wrapController,
  ENTITY_TYPES
};
