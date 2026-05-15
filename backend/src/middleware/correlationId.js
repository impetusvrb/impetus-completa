'use strict';

/**
 * IMPETUS — Correlation ID Middleware (Enterprise Hardening Bloco 10)
 *
 * Garante um X-Request-Id em cada request e propaga-o:
 *   • `req.id`                              — string canónica
 *   • `req.headers['x-request-id']`         — visível em downstream services
 *   • `res.setHeader('X-Request-Id', ...)`  — para o cliente correlacionar
 *
 * Quando um caller envia `X-Request-Id`/`X-Correlation-Id`, esse valor é
 * preservado (após sanitização). Caso contrário, geramos um identificador
 * sintético: `imp-<ts>-<rand>`.
 *
 * Aditivo: não interfere com `impetusAsyncContextBindMiddleware` (que continua
 * a ler o cabeçalho).
 */

const MAX_LEN = 128;
const VALID = /^[a-zA-Z0-9._:-]{4,128}$/;

function _sanitize(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, MAX_LEN);
  return VALID.test(s) ? s : null;
}

function _generate() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `imp-${ts}-${rnd}`;
}

function correlationIdMiddleware(req, res, next) {
  try {
    const incoming =
      _sanitize(req.headers['x-request-id']) ||
      _sanitize(req.headers['x-correlation-id']) ||
      _sanitize(req.headers['x-ai-trace-id']);
    const id = incoming || _generate();
    req.id = id;
    // Reescreve com valor sanitizado (evita injecção via header malformado).
    req.headers['x-request-id'] = id;
    if (!req.headers['x-ai-trace-id']) req.headers['x-ai-trace-id'] = id;
    try {
      res.setHeader('X-Request-Id', id);
    } catch (_e) {
      /* ignore */
    }
  } catch (_e) {
    /* never break pipeline */
  }
  next();
}

module.exports = { correlationIdMiddleware };
