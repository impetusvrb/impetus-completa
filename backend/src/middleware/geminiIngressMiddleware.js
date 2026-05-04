'use strict';

/**
 * Ingress Gemini global: define req.geminiContext antes do AsyncLocalStorage.
 * Activar com IMPETUS_GEMINI_INGRESS_ENABLED=true
 */

const { processHttpIngress } = require('../services/geminiIngressEngine');

function shouldSkipEntirely(req) {
  const p = String(req.originalUrl || req.url || '').split('?')[0];
  if (p.startsWith('/uploads') && !p.startsWith('/api')) return true;
  return false;
}

async function geminiIngressMiddleware(req, res, next) {
  if (shouldSkipEntirely(req)) {
    req.geminiContext = { mode: 'skipped', reason: 'static_upload_path' };
    return next();
  }

  try {
    req.geminiContext = await processHttpIngress(req);
  } catch (e) {
    req.geminiContext = {
      mode: 'full',
      validated: false,
      ingress_error: String(e && e.message ? e.message : e).slice(0, 400),
      registered_at: new Date().toISOString()
    };
  }
  next();
}

module.exports = { geminiIngressMiddleware };
