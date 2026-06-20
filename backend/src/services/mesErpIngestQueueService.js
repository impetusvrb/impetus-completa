'use strict';

/**
 * M1.19 — MES/ERP async ingest queue (MES-01)
 * Enfileira push webhook; consumer processa com retry + DLQ via industrial outbox.
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { publishIndustrialEvent } = require('../eventPipeline/industrialEventBackbone');

const _memoryQueue = [];
const MEMORY_CAP = parseInt(process.env.IMPETUS_MES_ERP_QUEUE_MEMORY_CAP || '2000', 10) || 2000;

let _stats = {
  enqueued: 0,
  processed: 0,
  failed: 0,
  dlq_routed: 0,
};

function isMesAsyncIngestionEnabled() {
  const v = process.env.IMPETUS_MES_ERP_ASYNC_INGEST;
  if (v == null || v === '') return true;
  return v === 'on' || v === 'true' || v === '1';
}

function _idempotencyKey(companyId, connectorId, payload) {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ companyId, connectorId, payload }))
    .digest('hex')
    .slice(0, 32);
  return `mes_erp:${companyId}:${connectorId}:${hash}`;
}

/**
 * Enfileira payload MES/ERP para processamento assíncrono.
 * @returns {Promise<{ ok: boolean, job_id: string, async: boolean }>}
 */
async function enqueueMesErpPush(companyId, connectorId, payload) {
  const jobId = uuidv4();
  const idempotencyKey = _idempotencyKey(companyId, connectorId, payload);

  if (!isMesAsyncIngestionEnabled()) {
    const core = require('./mesErpIntegrationService');
    const result = await core.processPushDirect(companyId, connectorId, payload);
    return { ok: true, job_id: jobId, async: false, ...result };
  }

  const envelope = {
    event_name: 'mes_erp.push.ingest',
    domain: 'mes_erp',
    company_id: companyId,
    correlation_id: jobId,
    idempotency_key: idempotencyKey,
    payload: {
      connector_id: connectorId,
      payload,
      enqueued_at: new Date().toISOString(),
    },
  };

  const published = await publishIndustrialEvent(envelope, { defer: true });
  if (published.ok) {
    _stats.enqueued += 1;
    return { ok: true, job_id: jobId, async: true, outbox_id: published.outbox_id || null };
  }

  if (_memoryQueue.length >= MEMORY_CAP) {
    const err = new Error('MES/ERP ingest queue saturated');
    err.status = 503;
    throw err;
  }

  _memoryQueue.push({
    id: jobId,
    company_id: companyId,
    connector_id: connectorId,
    payload,
    idempotency_key: idempotencyKey,
    attempts: 0,
    created_at: Date.now(),
  });
  _stats.enqueued += 1;
  return { ok: true, job_id: jobId, async: true, memory_fallback: true };
}

async function drainMemoryQueue(limit = 50) {
  const batch = _memoryQueue.splice(0, limit);
  const core = require('./mesErpIntegrationService');
  const results = [];
  for (const job of batch) {
    try {
      const r = await core.processPushDirect(job.company_id, job.connector_id, job.payload);
      _stats.processed += 1;
      results.push({ id: job.id, ok: true, recordsCount: r.recordsCount });
    } catch (err) {
      job.attempts += 1;
      if (job.attempts >= 5) {
        _stats.dlq_routed += 1;
        await _routeToDlq(job, err).catch(() => {});
      } else {
        job.next_attempt_at = Date.now() + Math.min(30000, 500 * Math.pow(2, job.attempts));
        _memoryQueue.push(job);
      }
      _stats.failed += 1;
      results.push({ id: job.id, ok: false, error: err?.message });
    }
  }
  return results;
}

async function _routeToDlq(job, err) {
  if (String(process.env.IMPETUS_INDUSTRIAL_DLQ_ENABLED || 'true').toLowerCase() === 'false') return;
  try {
    await db.query(
      `INSERT INTO mes_erp_sync_log (company_id, connector_id, sync_type, status, error_message, payload_summary)
       VALUES ($1, $2, 'push_dlq', 'error', $3, $4)`,
      [
        job.company_id,
        job.connector_id,
        String(err?.message || 'dlq').slice(0, 500),
        JSON.stringify({ job_id: job.id, attempts: job.attempts }),
      ]
    );
  } catch (e) {
    console.warn('[MES_ERP_DLQ]', e?.message ?? e);
  }
}

function getStats() {
  return {
    ..._stats,
    memory_pending: _memoryQueue.length,
    async_enabled: isMesAsyncIngestionEnabled(),
  };
}

module.exports = {
  isMesAsyncIngestionEnabled,
  enqueueMesErpPush,
  drainMemoryQueue,
  getStats,
};
