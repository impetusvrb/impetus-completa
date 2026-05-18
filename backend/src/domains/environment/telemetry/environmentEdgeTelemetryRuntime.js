'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('./environmentTelemetryRuntimeFlags');
const obs = require('./environmentTelemetryObservability');
const { publishEnvironmentIndustrialEvent } = require('../events/environmentEventPublisher');

/** Fila edge por tenant (shadow / processo único). */
const _queues = new Map();

function _queueFor(companyId) {
  const id = String(companyId);
  if (!_queues.has(id)) _queues.set(id, []);
  return _queues.get(id);
}

function enqueueEdgeSample(companyId, payload) {
  if (!flags.isEnvironmentTelemetryEdgeRuntimeEnabled()) {
    return { ok: false, code: 'EDGE_OFF' };
  }
  const q = _queueFor(companyId);
  const max = flags.getEnvironmentTelemetryEdgeBufferMax();
  const item = {
    id: uuidv4(),
    sequence: payload.edge_sequence != null ? String(payload.edge_sequence) : uuidv4(),
    idempotency_key: payload.idempotency_key != null ? String(payload.idempotency_key).slice(0, 128) : null,
    payload,
    enqueued_at: new Date().toISOString()
  };
  if (q.some((x) => x.idempotency_key && x.idempotency_key === item.idempotency_key)) {
    return { ok: true, duplicate: true, queue_size: q.length };
  }
  q.push(item);
  while (q.length > max) q.shift();
  obs.record('environment_realtime_queue_size', q.length, { company_id: String(companyId).slice(0, 8) });
  return { ok: true, queue_size: q.length, item_id: item.id };
}

function getEdgeQueueSnapshot(companyId) {
  const q = _queueFor(companyId);
  return {
    queue_size: q.length,
    buffer_max: flags.getEnvironmentTelemetryEdgeBufferMax(),
    oldest: q[0]?.enqueued_at || null,
    newest: q[q.length - 1]?.enqueued_at || null
  };
}

async function syncEdgeQueue(companyId, userId, ingestFn) {
  const t0 = Date.now();
  const q = _queueFor(companyId);
  if (!q.length) {
    return { ok: true, synced: 0, remaining: 0 };
  }
  const ordered = [...q].sort((a, b) => String(a.sequence).localeCompare(String(b.sequence)));
  let synced = 0;
  let failed = 0;
  const remain = [];

  for (const item of ordered) {
    const r = await ingestFn(companyId, userId, item.payload, { emit_sample_event: false });
    if (r.ok || r.skipped) {
      synced++;
    } else {
      failed++;
      remain.push(item);
    }
  }

  _queues.set(String(companyId), remain);
  const ms = Date.now() - t0;
  obs.record('environment_edge_sync_ms', ms, {});

  if (synced > 0 && flags.isEnvironmentTelemetryBackboneEventsEnabled()) {
    try {
      await publishEnvironmentIndustrialEvent(
        {
          event_name: 'environment.telemetry.edge_synced',
          company_id: companyId,
          correlation_id: uuidv4(),
          payload: { synced, failed, remaining: remain.length, duration_ms: ms }
        },
        { origin_layer: 'operational', intended_audience: 'technician', user_id: userId }
      );
    } catch {
      /* assistive */
    }
  }

  return { ok: failed === 0 || synced > 0, synced, failed, remaining: remain.length, duration_ms: ms };
}

function clearEdgeQueue(companyId) {
  _queues.set(String(companyId), []);
}

module.exports = {
  enqueueEdgeSample,
  getEdgeQueueSnapshot,
  syncEdgeQueue,
  clearEdgeQueue
};
