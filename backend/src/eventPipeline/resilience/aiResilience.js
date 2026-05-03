'use strict';

/**
 * Resiliência uniforme para chamadas de IA (Gemini, OpenAI, Claude).
 *
 *   1) Até 3 tentativas com backoff exponencial (500ms, 1s, 2s — jitter ±20%)
 *   2) Fallback determinístico se todas falharem
 *   3) Log estruturado da falha (pluggable; default = console)
 *
 * Não trata respostas semanticamente "ruins" — só erros (throw / rejected promise).
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_MS = 500;

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _jitter(ms) {
  const j = Math.round(ms * 0.2);
  const delta = Math.floor(Math.random() * (j * 2 + 1)) - j;
  return Math.max(0, ms + delta);
}

function _shouldRetry(err) {
  if (!err) return true;
  const code = err.code || err.status || err.statusCode;
  if (code === 400 || code === 401 || code === 403 || code === 404 || code === 422) return false;
  if (code === 'PROMPT_BLOCKED' || code === 'PROMPT_SECURITY_INGRESS') return false;
  return true;
}

let _logger = function defaultLogger(payload) {
  console.warn('[AI_RESILIENCE]', JSON.stringify(payload));
};

function setLogger(fn) {
  if (typeof fn === 'function') _logger = fn;
}

/**
 * @template T
 * @param {() => Promise<T>} fn — chamada à IA (ou qualquer operação retryable)
 * @param {{
 *   maxRetries?: number,
 *   baseMs?: number,
 *   fallback?: () => (T|Promise<T>),
 *   metadata?: { intent?: string, ia_chamada?: string, event_id?: string, type?: string }
 * }} [opts]
 * @returns {Promise<T>}
 */
async function callWithRetry(fn, opts = {}) {
  const maxRetries = opts.maxRetries != null ? Math.max(1, opts.maxRetries) : DEFAULT_MAX_RETRIES;
  const baseMs = opts.baseMs != null ? Math.max(1, opts.baseMs) : DEFAULT_BASE_MS;
  const meta = opts.metadata || {};
  let lastErr = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retriable = _shouldRetry(err);
      if (!retriable) {
        _logger({
          event: 'AI_RETRY_NON_RETRIABLE',
          attempt: i + 1,
          max_retries: maxRetries,
          err: err && err.message,
          err_code: err && (err.code || err.status),
          ...meta,
          timestamp: new Date().toISOString()
        });
        break;
      }
      if (i === maxRetries - 1) break;
      const wait = _jitter(baseMs * Math.pow(2, i));
      _logger({
        event: 'AI_RETRY_ATTEMPT',
        attempt: i + 1,
        next_wait_ms: wait,
        err: err && err.message,
        ...meta,
        timestamp: new Date().toISOString()
      });
      await _sleep(wait);
    }
  }

  _logger({
    event: 'AI_RETRY_EXHAUSTED',
    err: lastErr && lastErr.message,
    err_code: lastErr && (lastErr.code || lastErr.status),
    ...meta,
    timestamp: new Date().toISOString()
  });

  if (typeof opts.fallback === 'function') {
    return opts.fallback();
  }
  const e = new Error(`AI_RETRY_EXHAUSTED: ${lastErr && lastErr.message}`);
  e.code = 'AI_RETRY_EXHAUSTED';
  e.cause = lastErr;
  throw e;
}

module.exports = {
  callWithRetry,
  setLogger
};
