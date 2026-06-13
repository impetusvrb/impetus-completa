'use strict';

/**
 * AIOI-P1I.2 — Distributed Audit Trail
 * READ ONLY · observação · sem ação automática.
 */

const os = require('os');
const MAX_ENTRIES = 500;

const LAYER = 'AIOI_DISTRIBUTED_AUDIT';
const _entries = [];

function _append(event, data = {}) {
  const entry = {
    id: _entries.length + 1,
    event,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    pid: process.pid,
    worker_id: process.env.IMPETUS_AIOI_WORKER_ID || '0',
    ...data
  };
  _entries.push(entry);
  if (_entries.length > MAX_ENTRIES) _entries.shift();
  return entry;
}

function recordWorkerStartup(meta = {}) {
  return _append('worker_startup', meta);
}

function recordWorkerShutdown(meta = {}) {
  return _append('worker_shutdown', meta);
}

function recordLeaseAcquire(meta = {}) {
  return _append('lease_acquire', meta);
}

function recordLeaseRelease(meta = {}) {
  return _append('lease_release', meta);
}

function recordShardOwnership(meta = {}) {
  return _append('shard_ownership', meta);
}

function recordShardReassignment(meta = {}) {
  return _append('shard_reassignment', meta);
}

function recordFailover(meta = {}) {
  return _append('failover', meta);
}

function getAuditTrail({ limit = 100, event } = {}) {
  let list = [..._entries];
  if (event) list = list.filter(e => e.event === event);
  return {
    layer: LAYER,
    read_only: true,
    total: _entries.length,
    entries: list.slice(-limit).reverse()
  };
}

function getAuditSummary() {
  const byEvent = {};
  for (const e of _entries) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
  }
  return {
    layer: LAYER,
    total_events: _entries.length,
    by_event: byEvent,
    last_event: _entries.length ? _entries[_entries.length - 1] : null
  };
}

module.exports = {
  recordWorkerStartup,
  recordWorkerShutdown,
  recordLeaseAcquire,
  recordLeaseRelease,
  recordShardOwnership,
  recordShardReassignment,
  recordFailover,
  getAuditTrail,
  getAuditSummary,
  LAYER
};
