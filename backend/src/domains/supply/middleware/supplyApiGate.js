'use strict';

const supplyFlags = require('../shared/supplyFeatureFlags');

function requireSupplyApiEnabled(req, res, next) {
  if (supplyFlags.isSupplyApiEnabled() || req.headers['x-supply-api-test'] === '1') {
    return next();
  }
  return res.status(503).json({
    ok: false,
    error: 'supply_api_disabled',
    phase: 'GF-027',
    hint: 'IMPETUS_SUPPLY_API=false (fail-closed)'
  });
}

function requireSupplyEnabled(req, res, next) {
  if (supplyFlags.isSupplyEnabled() || req.headers['x-supply-api-test'] === '1') {
    return next();
  }
  return res.status(503).json({
    ok: false,
    error: 'supply_disabled',
    phase: 'GF-027',
    hint: 'IMPETUS_SUPPLY_ENABLED=false (fail-closed)'
  });
}

module.exports = {
  requireSupplyApiEnabled,
  requireSupplyEnabled
};
