'use strict';

/**
 * AIOI-P1K.2 — Production Rollout Registry
 * Registro only · sem execução de rollout.
 */

const os = require('os');

const LAYER = 'AIOI_PRODUCTION_ROLLOUT_REGISTRY';
const MAX_ENTRIES = 200;

const _history = [];
let _seq = 0;

function _nextId() {
  _seq += 1;
  return _seq;
}

function _baseEntry(type, payload = {}) {
  return {
    id: _nextId(),
    type,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    pid: process.pid,
    ...payload
  };
}

function registerRollout(payload = {}) {
  const entry = _baseEntry('rollout', {
    phase: payload.phase || 'P1K_SIM',
    status: payload.status || 'registered',
    approval_id: payload.approval_id || null,
    approved_by: payload.approved_by || null,
    metadata: payload.metadata || {},
    executed: false,
    note: 'registry_only — no runtime activation'
  });
  _history.push(entry);
  if (_history.length > MAX_ENTRIES) _history.shift();
  return entry;
}

function registerRollback(payload = {}) {
  const entry = _baseEntry('rollback', {
    from_phase: payload.from_phase || 'P1K_SIM',
    to_phase: payload.to_phase || 'P1J',
    reason: payload.reason || 'simulation',
    approval_id: payload.approval_id || null,
    metadata: payload.metadata || {},
    executed: false,
    note: 'registry_only — feature flags unchanged unless ops applies'
  });
  _history.push(entry);
  if (_history.length > MAX_ENTRIES) _history.shift();
  return entry;
}

function registerRolloutAttempt(payload = {}) {
  const entry = _baseEntry('rollout_attempt', {
    phase: payload.phase || 'P1K_SIM',
    status: payload.status || 'attempted',
    approval_id: payload.approval_id || null,
    metadata: payload.metadata || {}
  });
  _history.push(entry);
  if (_history.length > MAX_ENTRIES) _history.shift();
  return entry;
}

function getRolloutHistory({ limit = 50, type = null } = {}) {
  let items = [..._history];
  if (type) items = items.filter(e => e.type === type);
  items = items.slice(-limit).reverse();
  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    total: _history.length,
    items
  };
}

function getRolloutStatus() {
  const rollouts = _history.filter(e => e.type === 'rollout');
  const rollbacks = _history.filter(e => e.type === 'rollback');
  const attempts = _history.filter(e => e.type === 'rollout_attempt');
  const latestRollout = rollouts[rollouts.length - 1] || null;
  const latestRollback = rollbacks[rollbacks.length - 1] || null;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    registry_ready: true,
    rollouts_registered: rollouts.length,
    rollbacks_registered: rollbacks.length,
    attempts_registered: attempts.length,
    latest_rollout: latestRollout,
    latest_rollback: latestRollback,
    timestamp: new Date().toISOString()
  };
}

function resetRegistryForCert() {
  _history.length = 0;
  _seq = 0;
}

module.exports = {
  registerRollout,
  registerRollback,
  registerRolloutAttempt,
  getRolloutHistory,
  getRolloutStatus,
  resetRegistryForCert,
  LAYER,
  MAX_ENTRIES
};
