'use strict';

/**
 * Outbox industrial multi-domínio (WAVE 1).
 * Padrão auditOutboxService: memória + retry; Postgres quando outbox flag ON.
 */

const { v4: uuidv4 } = require('uuid');
const {
  isIndustrialOutboxEnabled,
  maxOutboxAttempts,
  outboxDrainBatchSize
} = require('../industrialFlags');

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30000;
const MEMORY_CAP = parseInt(process.env.IMPETUS_INDUSTRIAL_OUTBOX_MEMORY_CAP || '8000', 10) || 8000;

const _memoryQueue = [];
let _draining = false;
let _stats = {
  enqueued: 0,
  delivered: 0,
  deferred: 0,
  dlq_routed: 0,
  persist_failures: 0
};

function _nowMs() {
  return Date.now();
}

function _backoffFor(attempts) {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempts));
  return Math.floor(exp * (0.5 + Math.random()));
}

function _safeJson(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_e) {
    return {};
  }
}

async function _persistRow(row) {
  if (!isIndustrialOutboxEnabled()) return { ok: true, persisted: false };
  try {
    const db = require('../../../db');
    await db.query(
      `INSERT INTO industrial_event_outbox
       (id, event_name, domain, company_id, partition_key, idempotency_key,
        correlation_id, causation_id, trace_id, workflow_id, envelope, status, attempts, next_attempt_at, created_at)
       VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14::timestamptz, $15::timestamptz)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        row.id,
        row.event_name,
        row.domain,
        row.company_id,
        row.partition_key,
        row.idempotency_key,
        row.correlation_id,
        row.causation_id,
        row.trace_id,
        row.workflow_id,
        JSON.stringify(row.envelope),
        row.status,
        row.attempts,
        row.next_attempt_at,
        row.created_at
      ]
    );
    return { ok: true, persisted: true };
  } catch (err) {
    _stats.persist_failures += 1;
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * @param {object} envelope — saída de buildIndustrialEnvelope
 * @param {{ handler?: (env: object) => Promise<{ ok: boolean }> }} [opts]
 */
async function enqueueIndustrialEvent(envelope, opts = {}) {
  const env = _safeJson(envelope);
  const id = env.event_id || uuidv4();
  const row = {
    id,
    event_name: env.event_name,
    domain: env.domain,
    company_id: env.company_id,
    partition_key: env.partition_key,
    idempotency_key: env.idempotency_key,
    correlation_id: env.correlation_id,
    causation_id: env.causation_id || null,
    trace_id: env.trace_id || null,
    workflow_id: env.workflow_id || null,
    envelope: env,
    status: 'pending',
    attempts: 0,
    next_attempt_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    handler: opts.handler || null
  };

  _stats.enqueued += 1;

  if (isIndustrialOutboxEnabled()) {
    const pr = await _persistRow(row);
    if (!pr.ok) {
      _enqueueMemory(row);
      return { ok: false, deferred: true, id, reason: 'persist_failed' };
    }
    _scheduleDrain();
    return { ok: true, id, persisted: true };
  }

  _enqueueMemory(row);
  _scheduleDrain();
  return { ok: true, id, persisted: false, memory_only: true };
}

function _enqueueMemory(row) {
  if (_memoryQueue.length >= MEMORY_CAP) {
    _memoryQueue.shift();
  }
  _memoryQueue.push(row);
}

function _scheduleDrain() {
  if (_draining) return;
  _draining = true;
  setImmediate(() => {
    drainOutboxBatch().finally(() => {
      _draining = false;
    });
  });
}

/**
 * @param {(env: object) => Promise<{ ok: boolean, error?: string }>} [defaultHandler]
 */
async function drainOutboxBatch(defaultHandler) {
  const batchSize = outboxDrainBatchSize();
  const maxAttempts = maxOutboxAttempts();
  const batch = [];

  if (isIndustrialOutboxEnabled()) {
    try {
      const db = require('../../../db');
      const r = await Promise.race([
        db.query(
          `SELECT id, envelope, attempts, idempotency_key, event_name, domain, company_id
           FROM industrial_event_outbox
           WHERE status = 'pending' AND next_attempt_at <= now()
           ORDER BY created_at ASC
           LIMIT $1
           FOR UPDATE SKIP LOCKED`,
          [batchSize]
        ),
        new Promise((_, reject) => {
          const t = setTimeout(() => reject(new Error('outbox_drain_db_timeout')), 3000);
          if (typeof t.unref === 'function') t.unref();
        })
      ]);
      for (const row of r.rows || []) {
        batch.push({
          id: row.id,
          envelope: row.envelope,
          attempts: row.attempts,
          from_db: true
        });
      }
    } catch (_e) {
      /* fallback memória */
    }
  }

  while (batch.length < batchSize && _memoryQueue.length > 0) {
    const due = _memoryQueue.filter((e) => new Date(e.next_attempt_at).getTime() <= _nowMs());
    const next = due[0] || _memoryQueue[0];
    if (!next) break;
    const idx = _memoryQueue.indexOf(next);
    if (idx >= 0) _memoryQueue.splice(idx, 1);
    batch.push({ ...next, from_db: false });
  }

  const dlq = require('../dlq/industrialDlqService');
  const results = [];

  for (const item of batch) {
    const env = typeof item.envelope === 'string' ? JSON.parse(item.envelope) : item.envelope;
    const handler = item.handler || defaultHandler || (async () => ({ ok: true }));
    let delivery;
    try {
      delivery = await handler(env);
    } catch (err) {
      delivery = { ok: false, error: err?.message || String(err) };
    }

    if (delivery && delivery.ok) {
      _stats.delivered += 1;
      await _markDelivered(item);
      results.push({ id: item.id, status: 'delivered' });
      continue;
    }

    const attempts = (item.attempts || 0) + 1;
    if (attempts >= maxAttempts) {
      _stats.dlq_routed += 1;
      await dlq.moveToDlq(env, {
        reason: delivery?.error || 'max_attempts',
        attempts,
        source: 'outbox'
      });
      await _markFailed(item, attempts, 'dlq');
      results.push({ id: item.id, status: 'dlq' });
      continue;
    }

    _stats.deferred += 1;
    const dueAt = new Date(_nowMs() + _backoffFor(attempts)).toISOString();
    await _markRetry(item, attempts, dueAt, delivery?.error);
    results.push({ id: item.id, status: 'retry', attempts });
  }

  return { processed: results.length, results, stats: { ..._stats } };
}

async function _markDelivered(item) {
  if (!item.from_db || !isIndustrialOutboxEnabled()) return;
  try {
    const db = require('../../../db');
    await db.query(
      `UPDATE industrial_event_outbox SET status = 'delivered', delivered_at = now(), updated_at = now() WHERE id = $1::uuid`,
      [item.id]
    );
  } catch (_e) {}
}

async function _markFailed(item, attempts, status) {
  if (!item.from_db || !isIndustrialOutboxEnabled()) return;
  try {
    const db = require('../../../db');
    await db.query(
      `UPDATE industrial_event_outbox SET status = $2, attempts = $3, updated_at = now() WHERE id = $1::uuid`,
      [item.id, status, attempts]
    );
  } catch (_e) {}
}

async function _markRetry(item, attempts, dueAt, lastError) {
  if (item.from_db && isIndustrialOutboxEnabled()) {
    try {
      const db = require('../../../db');
      await db.query(
        `UPDATE industrial_event_outbox
         SET attempts = $2, next_attempt_at = $3::timestamptz, last_error = $4, updated_at = now()
         WHERE id = $1::uuid`,
        [item.id, attempts, dueAt, lastError ? String(lastError).slice(0, 2000) : null]
      );
      return;
    } catch (_e) {}
  }
  item.attempts = attempts;
  item.next_attempt_at = dueAt;
  item.last_error = lastError;
  _enqueueMemory(item);
}

function getOutboxStats() {
  return {
    ..._stats,
    memory_queue_depth: _memoryQueue.length,
    outbox_enabled: isIndustrialOutboxEnabled()
  };
}

module.exports = {
  enqueueIndustrialEvent,
  drainOutboxBatch,
  getOutboxStats
};
