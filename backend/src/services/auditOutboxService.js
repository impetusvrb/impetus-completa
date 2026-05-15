'use strict';

/**
 * IMPETUS — Audit Outbox Service (Enterprise Hardening Bloco 9, A10)
 *
 * Padrão outbox em memória + retry assíncrono para audit writes críticos.
 * Quando o INSERT em `ai_decision_logs` (ou outro ledger imutável) falha
 * transitivamente (e.g. timeout, deadlock), enfileiramos o payload e
 * tentamos N vezes com backoff. Após esgotamento, emitimos um log
 * estruturado de capacidade — operador externo (cron / replay) pode
 * apanhar o evento pelo log shipping.
 *
 * NÃO substitui o caminho síncrono actual: continua a ser a primeira
 * tentativa. O outbox é a "rede de segurança" que substitui o antigo
 * `catch { console.warn }` silencioso.
 *
 * Aditivo. Sem dependências externas. Cluster-naive (single-instance
 * protection) — operador deve plugar Redis/Pulsar no futuro; o contrato
 * `enqueueAuditWrite(name, payload, writer)` permanece estável.
 */

const MAX_BUFFER = parseInt(process.env.IMPETUS_AUDIT_OUTBOX_MAX || '5000', 10) || 5000;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30000;
const MAX_ATTEMPTS = 6;

const _queue = []; // [{ id, name, payload, writer, attempts, last_error, due_at }]
let _draining = false;
const _drainHandles = new Set();

function _nowMs() {
  return Date.now();
}

function _backoffFor(attempts) {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempts));
  // jitter para evitar sincronização de retries
  return Math.floor(exp * (0.5 + Math.random()));
}

/**
 * Tenta gravar imediatamente; em caso de falha enfileira para retry.
 * @param {string} name — nome lógico ('ai_decision_logs', 'support_recovery_audit_events'...)
 * @param {object} payload — dados serializáveis para retry
 * @param {(payload: object) => Promise<any>} writer — função que executa o INSERT
 */
async function enqueueAuditWrite(name, payload, writer) {
  try {
    await writer(payload);
    return { ok: true, attempts: 1 };
  } catch (err) {
    return _enqueueForRetry(name, payload, writer, err);
  }
}

function _enqueueForRetry(name, payload, writer, lastError) {
  if (_queue.length >= MAX_BUFFER) {
    // Em overflow, droppamos o mais antigo e logamos perda (raríssimo; gera alerta).
    const dropped = _queue.shift();
    try {
      console.error(
        '[AUDIT_OUTBOX_OVERFLOW]',
        JSON.stringify({
          event: 'AUDIT_OUTBOX_OVERFLOW',
          dropped_id: dropped?.id || null,
          dropped_name: dropped?.name || null,
          at: new Date().toISOString()
        })
      );
    } catch (_e) { /* ignore */ }
  }
  const entry = {
    id: `audit-${_nowMs()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    payload,
    writer,
    attempts: 1,
    last_error: lastError?.message || String(lastError),
    due_at: _nowMs() + _backoffFor(1)
  };
  _queue.push(entry);
  try {
    console.warn(
      '[AUDIT_OUTBOX_ENQUEUE]',
      JSON.stringify({
        event: 'AUDIT_OUTBOX_ENQUEUE',
        id: entry.id,
        name,
        attempts: entry.attempts,
        last_error: entry.last_error
      })
    );
  } catch (_e) { /* ignore */ }
  _scheduleDrain();
  return { ok: false, attempts: 1, deferred: true, id: entry.id };
}

function _scheduleDrain() {
  if (_draining) return;
  _draining = true;
  const handle = setTimeout(_drainOnce, 250);
  _drainHandles.add(handle);
}

async function _drainOnce() {
  _drainHandles.clear();
  if (!_queue.length) {
    _draining = false;
    return;
  }
  const now = _nowMs();
  const ready = _queue.filter((e) => e.due_at <= now).slice(0, 50);
  for (const entry of ready) {
    try {
      await entry.writer(entry.payload);
      // Sucesso — remove da fila.
      const idx = _queue.indexOf(entry);
      if (idx >= 0) _queue.splice(idx, 1);
      try {
        console.info(
          '[AUDIT_OUTBOX_DRAIN_OK]',
          JSON.stringify({
            event: 'AUDIT_OUTBOX_DRAIN_OK',
            id: entry.id,
            name: entry.name,
            attempts: entry.attempts
          })
        );
      } catch (_e) { /* ignore */ }
    } catch (err) {
      entry.attempts += 1;
      entry.last_error = err?.message || String(err);
      if (entry.attempts >= MAX_ATTEMPTS) {
        // Esgotamos retries: deixa marca no log (capacidade externa de replay).
        try {
          console.error(
            '[AUDIT_OUTBOX_PERMANENT_FAIL]',
            JSON.stringify({
              event: 'AUDIT_OUTBOX_PERMANENT_FAIL',
              id: entry.id,
              name: entry.name,
              attempts: entry.attempts,
              last_error: entry.last_error,
              payload: entry.payload // log structuredly — operador faz replay
            })
          );
        } catch (_e) { /* ignore */ }
        const idx = _queue.indexOf(entry);
        if (idx >= 0) _queue.splice(idx, 1);
      } else {
        entry.due_at = _nowMs() + _backoffFor(entry.attempts);
      }
    }
  }
  _draining = false;
  if (_queue.length) _scheduleDrain();
}

function getStats() {
  return {
    queue_size: _queue.length,
    draining: _draining,
    max_buffer: MAX_BUFFER,
    max_attempts: MAX_ATTEMPTS
  };
}

/** Para o draining (shutdown). Retries pendentes ficam no buffer (in-memory). */
function stop() {
  for (const h of _drainHandles) clearTimeout(h);
  _drainHandles.clear();
  _draining = false;
}

module.exports = {
  enqueueAuditWrite,
  getStats,
  stop
};
