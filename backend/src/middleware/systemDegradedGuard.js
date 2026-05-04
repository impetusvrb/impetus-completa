'use strict';

const { isDegraded } = require('../services/systemRuntimeState');

function _pathOnly(url) {
  return String(url || '').split('?')[0];
}

/**
 * Rotas que devem responder mesmo em DEGRADED (probes, auth, webhooks, sistema).
 */
function isExemptFromDegradedBlock(path) {
  const p = _pathOnly(path);
  if (!p.startsWith('/api')) return true;
  if (p === '/api/health' || p === '/api/health/settings-module') return true;
  if (p.startsWith('/api/system/')) return true;
  if (p.startsWith('/api/auth')) return true;
  if (p === '/api/webhook' || p.startsWith('/api/webhooks/')) return true;
  return false;
}

/**
 * Bloqueia tráfego /api (excepto lista branca) quando o processo está em DEGRADED.
 */
function systemDegradedGuard(req, res, next) {
  if (!isDegraded()) return next();
  const p = _pathOnly(req.originalUrl || req.url || '');
  if (isExemptFromDegradedBlock(p)) return next();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({
    ok: false,
    error: 'SYSTEM_DEGRADED',
    message: 'Sistema temporariamente indisponível para garantir consistência.'
  });
}

module.exports = {
  systemDegradedGuard,
  isExemptFromDegradedBlock
};
