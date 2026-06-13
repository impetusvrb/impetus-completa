'use strict';

/**
 * AIOI-P1E.3 — Worker Coordination Service
 *
 * Coordenação preparada para multi-worker / shard — observação apenas.
 * NÃO substitui advisory lock do aioiContinuousWorkerService (P1A certificado).
 *
 * ADDITIVE ONLY · lease via pg advisory lock por shard.
 *
 * Config:
 *   IMPETUS_AIOI_WORKER_ID=0
 *   IMPETUS_AIOI_SHARD_COUNT=1
 */

const db = require('../../../db');
const os = require('os');

const LAYER = 'AIOI_WORKER_COORDINATION';
const LEASE_BASE_KEY = 8820202610;
const DEFAULT_LEASE_TTL_MS = 60_000;

const _leases = new Map();

function _getWorkerId() {
  return String(process.env.IMPETUS_AIOI_WORKER_ID || '0');
}

function _getShardCount() {
  return Math.min(Math.max(parseInt(String(process.env.IMPETUS_AIOI_SHARD_COUNT || '1'), 10) || 1, 1), 64);
}

function _lockKey(shardId) {
  return LEASE_BASE_KEY + shardId;
}

function _workerIdentity() {
  return {
    worker_id: _getWorkerId(),
    hostname: os.hostname(),
    pid: process.pid
  };
}

/**
 * Adquire lease de shard (advisory lock).
 * @param {object} [opts]
 * @param {number} [opts.shardId=0]
 * @returns {Promise<object>}
 */
async function acquireWorkerLease({ shardId = 0 } = {}) {
  const existing = _leases.get(shardId);
  if (existing?.acquired && existing._client) {
    return { ok: true, lease: existing, mode: 'observation', reused: true };
  }

  const key = _lockKey(shardId);
  const client = await db.pool.connect();
  try {
    const r = await client.query('SELECT pg_try_advisory_lock($1) AS got', [key]);
    const acquired = r.rows[0]?.got === true;
    const identity = _workerIdentity();
    const lease = {
      shard_id: shardId,
      lock_key: key,
      acquired,
      acquired_at: acquired ? new Date().toISOString() : null,
      ttl_ms: DEFAULT_LEASE_TTL_MS,
      ...identity
    };
    if (acquired) {
      lease._client = client;
      _leases.set(shardId, lease);
      return { ok: true, lease, mode: 'observation' };
    }
    client.release();
    return { ok: false, lease, mode: 'observation' };
  } catch (err) {
    client.release();
    throw err;
  }
}

/**
 * Renova metadata de lease (in-process; lock PG persiste na sessão).
 * @param {number} shardId
 * @returns {object}
 */
function renewWorkerLease(shardId = 0) {
  const lease = _leases.get(shardId);
  if (!lease) {
    return { ok: false, error: 'no_active_lease', shard_id: shardId };
  }
  lease.renewed_at = new Date().toISOString();
  lease.renew_count = (lease.renew_count || 0) + 1;
  _leases.set(shardId, lease);
  return { ok: true, lease };
}

/**
 * Libera lease de shard.
 * @param {number} shardId
 * @returns {Promise<object>}
 */
async function releaseWorkerLease(shardId = 0) {
  const key = _lockKey(shardId);
  const held = _leases.get(shardId);
  const client = held?._client;

  if (!client) {
    _leases.delete(shardId);
    return { ok: true, released: false, shard_id: shardId, lock_key: key, note: 'no_session_lease' };
  }

  try {
    await client.query('SELECT pg_advisory_unlock($1)', [key]);
    _leases.delete(shardId);
    return { ok: true, released: true, shard_id: shardId, lock_key: key };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Status do cluster (observacional).
 * @returns {Promise<object>}
 */
async function getClusterStatus() {
  const shardCount = _getShardCount();
  const identity = _workerIdentity();
  const activeLeases = [];

  for (const [shardId, lease] of _leases.entries()) {
    activeLeases.push({ ...lease, shard_id: shardId });
  }

  let advisoryLocks = [];
  try {
    const r = await db.query(
      `SELECT pid, objid, granted FROM pg_locks
       WHERE locktype = 'advisory' AND objid >= $1 AND objid < $2`,
      [LEASE_BASE_KEY, LEASE_BASE_KEY + 64]
    );
    advisoryLocks = r.rows;
  } catch {
    advisoryLocks = [];
  }

  return {
    ok: true,
    layer: LAYER,
    mode: 'observation_only',
    replaces_p1a_advisory_lock: false,
    worker: identity,
    shard_count: shardCount,
    active_leases_in_process: activeLeases,
    advisory_locks_db: advisoryLocks,
    p1a_lock_key: 8820202607,
    coordination_ready: true,
    distributed_active: false,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  acquireWorkerLease,
  renewWorkerLease,
  releaseWorkerLease,
  getClusterStatus,
  LEASE_BASE_KEY,
  LAYER
};
