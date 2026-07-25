'use strict';

/**
 * APPSEC-01 — Enterprise Public Endpoint Protection
 * Política única para endpoints técnicos públicos (health, metrics, status).
 */

const flags = require('./config/appsecFlags');

const ACCESS = Object.freeze({
  FULL: 'full',
  MINIMAL: 'minimal',
  DENIED: 'denied'
});

function isLocalRequest(req) {
  const raw = String(req.ip || '');
  const forwarded = (req.get('x-forwarded-for') || '').split(',')[0].trim();
  const candidate = forwarded || raw;
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(candidate)) return true;
  if (req.socket?.remoteAddress && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
    return true;
  }
  return false;
}

function hasHealthKey(req) {
  const secret = (process.env.HEALTH_DETAIL_KEY || '').trim();
  if (!secret) return false;
  const header = (req.get('x-health-key') || '').trim();
  return Boolean(header && header === secret);
}

async function resolveAuthenticatedInternalAdmin(req) {
  const token =
    (req.headers.authorization || '').replace('Bearer ', '').trim() ||
    req.headers['x-access-token'] ||
    null;
  if (!token) return null;
  try {
    const { validateSession } = require('../middleware/auth');
    const { userIsInternalAdmin } = require('../middleware/internalRouteGuard');
    const user = await validateSession(token);
    if (user && userIsInternalAdmin(user)) return user;
  } catch (_) { /* ignore */ }
  return null;
}

/**
 * @param {import('express').Request} req
 * @param {{ allowLoopbackFull?: boolean, requireKeyForLoopback?: boolean }} [opts]
 * @returns {Promise<string>} ACCESS.FULL | ACCESS.MINIMAL | ACCESS.DENIED
 */
async function resolvePublicAccess(req, opts = {}) {
  if (!flags.isPublicEndpointPolicyEnabled()) {
    if (hasHealthKey(req) || (opts.allowLoopbackFull !== false && isLocalRequest(req))) {
      return ACCESS.FULL;
    }
    return ACCESS.MINIMAL;
  }

  if (hasHealthKey(req)) return ACCESS.FULL;

  const admin = await resolveAuthenticatedInternalAdmin(req);
  if (admin) return ACCESS.FULL;

  const forwarded = (req.get('x-forwarded-for') || '').trim();
  if (forwarded) {
    return ACCESS.MINIMAL;
  }

  if (opts.allowLoopbackFull !== false && isLocalRequest(req) && !opts.requireKeyForLoopback) {
    return ACCESS.FULL;
  }

  return ACCESS.MINIMAL;
}

/**
 * Middleware Express — define req.appsecPublicAccess.
 */
function publicEndpointGuard(opts = {}) {
  return async (req, res, next) => {
    try {
      req.appsecPublicAccess = await resolvePublicAccess(req, opts);
      if (req.appsecPublicAccess === ACCESS.DENIED) {
        return res.status(403).json({ ok: false, error: 'Forbidden', code: 'PUBLIC_ENDPOINT_DENIED' });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Responde com payload mínimo ou completo conforme política.
 */
async function respondWithPolicy(req, res, { minimal, full, deniedStatus = 403 }) {
  const access = req.appsecPublicAccess || (await resolvePublicAccess(req));
  if (access === ACCESS.DENIED) {
    return res.status(deniedStatus).json({ ok: false, error: 'Forbidden', code: 'PUBLIC_ENDPOINT_DENIED' });
  }
  if (access === ACCESS.FULL) {
    return res.json(typeof full === 'function' ? full() : full);
  }
  return res.json(typeof minimal === 'function' ? minimal() : minimal);
}

module.exports = {
  ACCESS,
  isLocalRequest,
  hasHealthKey,
  resolvePublicAccess,
  publicEndpointGuard,
  respondWithPolicy
};
