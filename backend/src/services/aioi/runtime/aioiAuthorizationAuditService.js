'use strict';

/**
 * AIOI-P1M.4 — Authorization Audit Trail
 * Append-only · imutável · READ ONLY export.
 */

const os = require('os');
const crypto = require('crypto');

const LAYER = 'AIOI_AUTHORIZATION_AUDIT';
const MAX_ENTRIES = 2000;

const _trail = [];
let _seq = 0;

function _append(event, payload = {}) {
  _seq += 1;
  const entry = Object.freeze({
    id: _seq,
    event,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    pid: process.pid,
    ...payload
  });
  _trail.push(entry);
  if (_trail.length > MAX_ENTRIES) _trail.shift();
  return entry;
}

function recordRequest(entry) {
  return _append('authorization_request', {
    request_id: entry.request_id,
    scope: entry.scope,
    requester: entry.requested_by,
    decision: 'requested',
    required_approvals: entry.required_approvals
  });
}

function recordApproval(entry) {
  return _append('authorization_approval', {
    request_id: entry.request_id,
    scope: entry.scope,
    requester: entry.requested_by,
    approver: entry.approver,
    decision: 'approved',
    approval_count: entry.approval_count
  });
}

function recordRejection(entry) {
  return _append('authorization_rejection', {
    request_id: entry.request_id,
    scope: entry.scope,
    requester: entry.requested_by,
    approver: entry.rejected_by,
    decision: 'rejected',
    reason: entry.reason
  });
}

function recordExpiration(entry) {
  return _append('authorization_expiration', {
    request_id: entry.request_id,
    scope: entry.scope,
    requester: entry.requested_by,
    decision: 'expired',
    reason: entry.reason || 'ttl_exceeded'
  });
}

function recordRevocation(entry) {
  return _append('authorization_revocation', {
    request_id: entry.request_id,
    scope: entry.scope,
    requester: entry.requested_by,
    approver: entry.revoked_by,
    decision: 'revoked',
    reason: entry.reason
  });
}

function recordInvalidation(entry) {
  return _append('authorization_invalidation', {
    request_id: entry.request_id,
    scope: entry.scope,
    decision: 'invalidated',
    reason: entry.reason || 'state_change'
  });
}

function getAuthorizationHistory({ limit = 100, request_id = null } = {}) {
  let items = [..._trail];
  if (request_id) items = items.filter(e => e.request_id === request_id);
  items = items.slice(-limit).reverse();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    immutable: true,
    total: _trail.length,
    items
  };
}

function verifyAuditIntegrity() {
  const ids = _trail.map(e => e.id);
  const monotonic = ids.every((id, i) => i === 0 || id > ids[i - 1]);
  const checksum = crypto.createHash('sha256')
    .update(JSON.stringify(_trail.map(e => ({ id: e.id, event: e.event, request_id: e.request_id }))))
    .digest('hex');

  return {
    audit_integrity: monotonic && _trail.length >= 0,
    entries: _trail.length,
    monotonic_ids: monotonic,
    checksum
  };
}

function resetAuditForCert() {
  _trail.length = 0;
  _seq = 0;
}

module.exports = {
  recordRequest,
  recordApproval,
  recordRejection,
  recordExpiration,
  recordRevocation,
  recordInvalidation,
  getAuthorizationHistory,
  verifyAuditIntegrity,
  resetAuditForCert,
  LAYER
};
