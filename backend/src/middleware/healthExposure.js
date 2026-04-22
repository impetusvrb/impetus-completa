'use strict';

/**
 * Detalhes técnicos de /health só com HEALTH_DETAIL_KEY no cabeçalho X-Health-Key
 * ou quando o pedido é tratado como local (loopback).
 */
function isLocalRequest(req) {
  const raw = String(req.ip || '');
  const forwarded = (req.get('x-forwarded-for') || '').split(',')[0].trim();
  const candidate = forwarded || raw;
  if (candidate === '127.0.0.1' || candidate === '::1' || candidate === '::ffff:127.0.0.1') {
    return true;
  }
  if (req.socket?.remoteAddress && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
    return true;
  }
  return false;
}

function allowHealthDetails(req) {
  const secret = (process.env.HEALTH_DETAIL_KEY || '').trim();
  if (secret) {
    const header = (req.get('x-health-key') || '').trim();
    if (header && header === secret) return true;
  }
  return isLocalRequest(req);
}

module.exports = {
  allowHealthDetails,
  isLocalRequest
};
