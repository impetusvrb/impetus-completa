'use strict';

/**
 * SEC-01 — Middleware passivo HTTP (agrega samples, não bloqueia).
 * No-op imediato quando SECURITY_OBSERVATORY=false.
 */

const flags = require('../config/securityObservatoryFlags');
const metrics = require('../metrics/securityMetricsStore');

function resolveClientIp(req) {
  const fwd = (req.get && req.get('x-forwarded-for')) || '';
  const first = String(fwd).split(',')[0].trim();
  return first || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function securityObservatoryMiddleware(req, res, next) {
  if (!flags.isSecurityObservatoryEnabled()) return next();

  const t0 = Date.now();
  const path = (req.originalUrl || req.path || '').split('?')[0];
  const ip = resolveClientIp(req);
  const ua = (req.get && req.get('user-agent')) || '';

  res.on('finish', () => {
    try {
      const bytes = Number(res.getHeader('content-length')) || 0;
      metrics.recordHttpSample({
        ip,
        path,
        method: req.method,
        status: res.statusCode,
        bytes,
        latencyMs: Date.now() - t0,
        userAgent: ua,
        timestamp: Date.now()
      });
    } catch (e) {
      try {
        require('../observatory/securityObservatoryRuntime').recordError('middleware', e);
      } catch (_x) {}
    }
  });

  return next();
}

module.exports = { securityObservatoryMiddleware };
