'use strict';

const wmsFlags = require('../shared/wmsFeatureFlags');

function requireWmsApiEnabled(req, res, next) {
  if (wmsFlags.isWmsApiEnabled() || req.headers['x-wms-api-test'] === '1') {
    return next();
  }
  return res.status(503).json({
    ok: false,
    error: 'wms_api_disabled',
    phase: 'WMS-003',
    hint: 'IMPETUS_WMS_API_ENABLED=false (fail-closed)'
  });
}

function requireInventoryApi(req, res, next) {
  if (
    wmsFlags.isInventoryApiEnabled() ||
    wmsFlags.isWmsApiEnabled() ||
    req.headers['x-wms-api-test'] === '1'
  ) {
    return next();
  }
  return res.status(503).json({ ok: false, error: 'inventory_api_disabled', phase: 'WMS-003' });
}

module.exports = {
  requireWmsApiEnabled,
  requireInventoryApi
};
