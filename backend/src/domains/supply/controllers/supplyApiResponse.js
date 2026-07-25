'use strict';

const { listContractTypes, CONTRACT_VERSION } = require('../contracts/interfaces');

function apiOk(res, { contract, data, meta = {}, status = 200 }) {
  return res.status(status).json({
    ok: true,
    phase: 'GF-027',
    contract,
    contract_version: CONTRACT_VERSION,
    data,
    meta: {
      source: meta.source || 'supply_runtime',
      pilot_layer: meta.pilot_layer || false,
      ...meta
    }
  });
}

function apiError(res, status, error, extra = {}) {
  return res.status(status).json({ ok: false, phase: 'GF-027', error, ...extra });
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
    const { logSupplyApiEvent } = require('../shared/supplyApiObservability');
    try {
      await fn(req, res, { apiOk, apiError, tenantId, contract });
      logSupplyApiEvent({
        method: req.method,
        path: req.originalUrl || req.path,
        status: res.statusCode || 200,
        duration_ms: Date.now() - t0,
        contract
      });
    } catch (err) {
      logSupplyApiEvent({
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
  listContractTypes,
  CONTRACT_VERSION
};
