'use strict';

const systemRuntimeState = require('../services/systemRuntimeState');
const resilienceMetrics = require('../services/resilienceMetricsService');

function pathOnly(url) {
  return String(url || '').split('?')[0];
}

function isApiPath(path) {
  return pathOnly(path).startsWith('/api');
}

/**
 * Em LIMITED: HEAVY não é bloqueado — passa como NORMAL com modo degradado (pipeline mais leve).
 */
function limitedHeavyGuard(req, res, next) {
  if (!systemRuntimeState.isLimited()) return next();
  const cls = req.impetusRequestClass || 'NORMAL';
  if (cls === 'CRITICAL' || cls === 'NORMAL') return next();
  if (!isApiPath(req.originalUrl || req.url)) return next();

  req.degradedMode = true;
  req.impetusOriginalRequestClass = 'HEAVY';
  req.impetusRequestClass = 'NORMAL';
  resilienceMetrics.recordHeavyDegradedPass();
  return next();
}

module.exports = { limitedHeavyGuard };
