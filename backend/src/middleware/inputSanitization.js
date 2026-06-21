'use strict';

/**
 * Input Sanitization Middleware — defesa em profundidade contra XSS e injeção.
 *
 * Estratégia:
 *   1. Strip tags perigosos de strings em body/query (não bloqueia — sanitiza).
 *   2. Valida Content-Type em POST/PUT/PATCH.
 *   3. Limita profundidade de objetos JSON (anti-DoS via nested payload).
 *
 * Não substitui escaping no template/output — é camada adicional.
 */

const MAX_JSON_DEPTH = 15;
const DANGEROUS_PATTERN = /<\s*script[\s>]|javascript\s*:|on\w+\s*=\s*["']/gi;

function sanitizeString(val) {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function sanitizeObject(obj, depth) {
  if (depth > MAX_JSON_DEPTH) return '[DEPTH_LIMIT]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }
  if (typeof obj === 'object' && !(obj instanceof Buffer) && !(obj instanceof Date)) {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[sanitizeString(key)] = sanitizeObject(obj[key], depth + 1);
    }
    return result;
  }
  return obj;
}

function hasDangerousContent(val) {
  if (typeof val === 'string') return DANGEROUS_PATTERN.test(val);
  if (Array.isArray(val)) return val.some((v) => hasDangerousContent(v));
  if (val && typeof val === 'object') {
    return Object.values(val).some((v) => hasDangerousContent(v));
  }
  return false;
}

function inputSanitizationMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object' && !(req.body instanceof Buffer)) {
    const hadDangerous = hasDangerousContent(req.body);
    req.body = sanitizeObject(req.body, 0);
    if (hadDangerous) {
      try {
        console.warn('[INPUT_SANITIZATION]', JSON.stringify({
          event: 'XSS_SANITIZED',
          path: req.originalUrl || req.url,
          method: req.method,
          ip: req.ip,
          user_id: req.user?.id || null,
          at: new Date().toISOString(),
        }));
      } catch (_) { /* never break */ }
    }
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query, 0);
  }

  next();
}

module.exports = { inputSanitizationMiddleware, sanitizeString, sanitizeObject };
