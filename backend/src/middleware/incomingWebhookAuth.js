'use strict';

const crypto = require('crypto');

/**
 * Compara segredos em tempo aproximadamente constante (evita timing leaks).
 */
function safeEqualToken(a, b) {
  const x = crypto.createHash('sha256').update(String(a ?? ''), 'utf8').digest();
  const y = crypto.createHash('sha256').update(String(b ?? ''), 'utf8').digest();
  return crypto.timingSafeEqual(x, y);
}

function logWebhookAuthFailure(code, req, extra = {}) {
  try {
    console.warn(
      '[WEBHOOK_AUTH]',
      JSON.stringify({
        code,
        path: req.originalUrl || req.url,
        method: req.method,
        ip: req.ip,
        ...extra
      })
    );
  } catch (_) {
    /* no-op */
  }
}

function getMetaAppSecret() {
  return String(
    process.env.META_APP_SECRET ||
      process.env.WHATSAPP_APP_SECRET ||
      process.env.FACEBOOK_APP_SECRET ||
      ''
  ).trim();
}

/**
 * Valida X-Hub-Signature-256 (Meta / WhatsApp Cloud API) sobre o corpo bruto.
 */
function verifyMetaSignature256(rawBody, signatureHeader, appSecret) {
  if (!rawBody || !Buffer.isBuffer(rawBody) || !rawBody.length) return false;
  if (!signatureHeader || !appSecret) return false;
  const sig = String(signatureHeader).trim();
  const prefix = 'sha256=';
  if (!sig.startsWith(prefix)) return false;
  const receivedHex = sig.slice(prefix.length);
  if (!/^[0-9a-f]+$/i.test(receivedHex) || receivedHex.length !== 64) return false;
  const hmac = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(receivedHex, 'hex');
  const b = Buffer.from(hmac, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * POST /api/webhook — exige segredo partilhado (header ou Bearer).
 * Variável: INCOMING_WEBHOOK_SECRET (ou IMPETUS_INCOMING_WEBHOOK_SECRET).
 */
function requireIncomingWebhookSecret(req, res, next) {
  const secret =
    process.env.INCOMING_WEBHOOK_SECRET ||
    process.env.IMPETUS_INCOMING_WEBHOOK_SECRET ||
    '';

  const header =
    req.headers['x-webhook-secret'] ||
    req.headers['x-impetus-webhook-secret'] ||
    '';
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const provided = String(header || bearer || '').trim();

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        ok: false,
        error: 'Webhook desativado: configure INCOMING_WEBHOOK_SECRET no servidor.',
        code: 'WEBHOOK_SECRET_NOT_CONFIGURED'
      });
    }
    console.warn(
      '[WEBHOOK] INCOMING_WEBHOOK_SECRET não definido — pedidos rejeitados. Defina o segredo em desenvolvimento.'
    );
    return res.status(503).json({
      ok: false,
      error: 'Configure INCOMING_WEBHOOK_SECRET no .env (obrigatório para /api/webhook).',
      code: 'WEBHOOK_SECRET_NOT_CONFIGURED'
    });
  }

  if (!provided || !safeEqualToken(provided, secret)) {
    logWebhookAuthFailure('SHARED_SECRET_MISMATCH', req);
    return res.status(401).json({
      ok: false,
      error: 'Webhook não autorizado.',
      code: 'WEBHOOK_UNAUTHORIZED'
    });
  }

  next();
}

/**
 * Autenticação unificada para /api/webhook:
 * 1) Se existir META_APP_SECRET (ou aliases) e o pedido trouxer X-Hub-Signature-256,
 *    valida HMAC sobre req.rawBody (obrigatório — configurado em server.js).
 * 2) Caso contrário, segredo partilhado INCOMING_WEBHOOK_SECRET (integrações genéricas).
 *
 * Permite convivência: Meta envia assinatura; outros clientes usam só o segredo partilhado.
 */
function requireWebhookAuth(req, res, next) {
  const metaSig = req.headers['x-hub-signature-256'];
  const appSecret = getMetaAppSecret();

  if (metaSig && appSecret) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      logWebhookAuthFailure('META_RAW_BODY_MISSING', req, {
        hint: 'POST /api/webhook requer raw body (ver server.js)'
      });
      return res.status(401).json({
        ok: false,
        error: 'Assinatura Meta inválida ou corpo em falta.',
        code: 'WEBHOOK_META_SIGNATURE_INVALID'
      });
    }
    if (verifyMetaSignature256(raw, metaSig, appSecret)) {
      return next();
    }
    logWebhookAuthFailure('META_SIGNATURE_MISMATCH', req);
    return res.status(401).json({
      ok: false,
      error: 'Assinatura Meta inválida.',
      code: 'WEBHOOK_META_SIGNATURE_INVALID'
    });
  }

  return requireIncomingWebhookSecret(req, res, next);
}

module.exports = {
  requireIncomingWebhookSecret,
  requireWebhookAuth,
  safeEqualToken,
  logWebhookAuthFailure,
  verifyMetaSignature256
};
