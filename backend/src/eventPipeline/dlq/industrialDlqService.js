'use strict';

/**
 * DLQ industrial — eventos com falha permanente após N tentativas no outbox.
 */

const { v4: uuidv4 } = require('uuid');
const { isIndustrialDlqEnabled } = require('../industrialFlags');

const _memoryDlq = [];
const MEMORY_CAP = parseInt(process.env.IMPETUS_INDUSTRIAL_DLQ_MEMORY_CAP || '2000', 10) || 2000;

let _stats = { moved: 0, persist_failures: 0 };

function _safeJson(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_e) {
    return {};
  }
}

/**
 * @param {object} envelope
 * @param {{ reason?: string, attempts?: number, source?: string }} [meta]
 */
async function moveToDlq(envelope, meta = {}) {
  if (!isIndustrialDlqEnabled()) {
    _logDlqShadow(envelope, meta);
    return { ok: true, shadow: true };
  }

  const env = _safeJson(envelope);
  const id = uuidv4();
  const row = {
    id,
    event_name: env.event_name,
    domain: env.domain,
    company_id: env.company_id,
    idempotency_key: env.idempotency_key,
    correlation_id: env.correlation_id,
    envelope: env,
    failure_reason: meta.reason != null ? String(meta.reason).slice(0, 2000) : 'unknown',
    attempts: meta.attempts != null ? Number(meta.attempts) : 0,
    source: meta.source || 'outbox',
    created_at: new Date().toISOString()
  };

  _stats.moved += 1;

  try {
    const dlqObs = require('../../observability/dlqMonitor');
    const obsFlags = require('../../observability/observabilityFlags');
    if (obsFlags.isDlqMonitoringEnabled()) dlqObs.pollDlqStats();
  } catch (_e) {}

  try {
    const db = require('../../../db');
    await db.query(
      `INSERT INTO industrial_event_dlq
       (id, event_name, domain, company_id, idempotency_key, correlation_id, envelope,
        failure_reason, attempts, source, created_at)
       VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7::jsonb, $8, $9, $10, $11::timestamptz)
       ON CONFLICT (idempotency_key) DO UPDATE SET
         failure_reason = EXCLUDED.failure_reason,
         attempts = GREATEST(industrial_event_dlq.attempts, EXCLUDED.attempts),
         envelope = EXCLUDED.envelope`,
      [
        row.id,
        row.event_name,
        row.domain,
        row.company_id,
        row.idempotency_key,
        row.correlation_id,
        JSON.stringify(row.envelope),
        row.failure_reason,
        row.attempts,
        row.source,
        row.created_at
      ]
    );
    return { ok: true, id };
  } catch (err) {
    _stats.persist_failures += 1;
    if (_memoryDlq.length >= MEMORY_CAP) _memoryDlq.shift();
    _memoryDlq.push(row);
    return { ok: false, id, error: err?.message || String(err), memory_fallback: true };
  }
}

function _logDlqShadow(envelope, meta) {
  try {
    console.info(
      '[INDUSTRIAL_DLQ_SHADOW]',
      JSON.stringify({
        event: 'INDUSTRIAL_DLQ_SHADOW',
        event_name: envelope?.event_name,
        company_id: envelope?.company_id,
        reason: meta.reason,
        attempts: meta.attempts,
        ts: new Date().toISOString()
      })
    );
  } catch (_e) {}
}

function getDlqStats() {
  return {
    ..._stats,
    memory_dlq_depth: _memoryDlq.length,
    dlq_enabled: isIndustrialDlqEnabled()
  };
}

function listMemoryDlq(limit = 50) {
  return _memoryDlq.slice(-Math.min(limit, _memoryDlq.length));
}

module.exports = {
  moveToDlq,
  getDlqStats,
  listMemoryDlq
};
