'use strict';

/**
 * Bloco 5 — Log de acesso HTTP na aplicação (IP, rota, status, duração).
 * Complementa nginx; activo por defeito em produção.
 *
 * SECURITY_HTTP_ACCESS_LOG=false para desactivar.
 */

function isEnabled() {
  if (process.env.SECURITY_HTTP_ACCESS_LOG === 'false') return false;
  if (process.env.SECURITY_HTTP_ACCESS_LOG === 'true') return true;
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '-';
}

function requestAccessLogMiddleware(req, res, next) {
  if (!isEnabled()) return next();

  const t0 = Date.now();
  res.on('finish', () => {
    const entry = {
      ts: new Date().toISOString(),
      ip: clientIp(req),
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ms: Date.now() - t0,
      requestId: req.id || req.headers['x-request-id'] || null,
      userAgent: (req.headers['user-agent'] || '').slice(0, 200)
    };
    console.log('[HTTP_ACCESS]', JSON.stringify(entry));
  });

  next();
}

module.exports = { requestAccessLogMiddleware, isEnabled };
