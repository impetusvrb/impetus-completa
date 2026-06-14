'use strict';

/**
 * AIOI-P1M.2 / P1M.5 — Runtime Authorization Registry
 * Registro only · sem execução · expiração e revogação.
 */

const os = require('os');
const policySvc = require('./aioiAuthorizationPolicyService');
const auditSvc = require('./aioiAuthorizationAuditService');

const LAYER = 'AIOI_RUNTIME_AUTHORIZATION_REGISTRY';
const MAX_REQUESTS = 500;

const _requests = new Map();
let _seq = 0;

function _nextId() {
  _seq += 1;
  return `AUTH-REQ-${Date.now()}-${_seq}`;
}

function createAuthorizationRequest(payload = {}) {
  const scope = payload.scope || 'continuous_runtime';
  const policyResult = policySvc.getPolicyForScope(scope);
  if (!policyResult.ok) {
    return { ok: false, error: 'invalid_scope', scope };
  }
  const policy = policyResult.policy;
  const ttl = payload.ttl_ms ?? policy.ttl_ms;
  const now = Date.now();

  const request = {
    request_id: _nextId(),
    scope,
    status: 'PENDING',
    required_approvals: policy.required_approvals,
    approval_type: policy.approval_type,
    approvals: [],
    requested_by: payload.requested_by || 'unknown',
    requested_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttl).toISOString(),
    ttl_ms: ttl,
    rejected_by: null,
    rejected_at: null,
    revoked_by: null,
    revoked_at: null,
    expired_at: null,
    hostname: os.hostname(),
    pid: process.pid,
    metadata: payload.metadata || {},
    runtime_activated: false,
    auto_authorize: false
  };

  _requests.set(request.request_id, request);
  auditSvc.recordRequest(request);

  if (_requests.size > MAX_REQUESTS) {
    const oldest = _requests.keys().next().value;
    _requests.delete(oldest);
  }

  return { ok: true, request };
}

function addApproval({ request_id, approver, note = null } = {}) {
  const request = _requests.get(request_id);
  if (!request) return { ok: false, error: 'request_not_found', request_id };
  if (!['PENDING', 'PARTIALLY_APPROVED'].includes(request.status)) {
    return { ok: false, error: 'request_not_pending', status: request.status };
  }
  if (!approver) return { ok: false, error: 'approver_required' };
  if (request.approvals.some(a => a.approver === approver)) {
    return { ok: false, error: 'duplicate_approver', conflict: true };
  }

  request.approvals.push({ approver, at: new Date().toISOString(), note });
  auditSvc.recordApproval({
    request_id,
    scope: request.scope,
    requested_by: request.requested_by,
    approver,
    approval_count: request.approvals.length
  });

  if (request.approvals.length >= request.required_approvals) {
    request.status = 'APPROVED';
    request.approved_at = new Date().toISOString();
  } else {
    request.status = 'PARTIALLY_APPROVED';
  }

  _requests.set(request_id, request);
  return { ok: true, request, conflict: false };
}

function rejectAuthorizationRequest({ request_id, rejected_by, reason = null } = {}) {
  const request = _requests.get(request_id);
  if (!request) return { ok: false, error: 'request_not_found' };
  if (!['PENDING', 'PARTIALLY_APPROVED'].includes(request.status)) {
    return { ok: false, error: 'request_not_pending' };
  }

  request.status = 'REJECTED';
  request.rejected_by = rejected_by || 'unknown';
  request.rejected_at = new Date().toISOString();
  request.rejection_reason = reason;
  _requests.set(request_id, request);

  auditSvc.recordRejection({
    request_id,
    scope: request.scope,
    requested_by: request.requested_by,
    rejected_by: request.rejected_by,
    reason
  });

  return { ok: true, request };
}

function expireAuthorizationRequest(request_id, reason = 'ttl_exceeded') {
  const request = _requests.get(request_id);
  if (!request) return { ok: false, error: 'request_not_found' };
  if (['EXPIRED', 'REVOKED', 'REJECTED'].includes(request.status)) {
    return { ok: false, error: 'already_terminal', status: request.status };
  }

  request.status = 'EXPIRED';
  request.expired_at = new Date().toISOString();
  request.expiration_reason = reason;
  _requests.set(request_id, request);

  auditSvc.recordExpiration({
    request_id,
    scope: request.scope,
    requested_by: request.requested_by,
    reason
  });

  return { ok: true, request };
}

function revokeAuthorizationRequest({ request_id, revoked_by, reason = null } = {}) {
  const request = _requests.get(request_id);
  if (!request) return { ok: false, error: 'request_not_found' };
  if (request.status === 'REVOKED') {
    return { ok: false, error: 'already_revoked' };
  }

  request.status = 'REVOKED';
  request.revoked_by = revoked_by || 'unknown';
  request.revoked_at = new Date().toISOString();
  request.revocation_reason = reason;
  _requests.set(request_id, request);

  auditSvc.recordRevocation({
    request_id,
    scope: request.scope,
    requested_by: request.requested_by,
    revoked_by: request.revoked_by,
    reason
  });

  return { ok: true, request };
}

function invalidateByStateChange(request_id, reason = 'state_change') {
  const request = _requests.get(request_id);
  if (!request || request.status === 'EXPIRED') {
    return { ok: false, error: 'not_invalidatable' };
  }
  auditSvc.recordInvalidation({ request_id, scope: request.scope, reason });
  return expireAuthorizationRequest(request_id, reason);
}

function processPendingExpirations() {
  const now = Date.now();
  let expired = 0;
  for (const [id, req] of _requests.entries()) {
    if (['PENDING', 'PARTIALLY_APPROVED', 'APPROVED'].includes(req.status)) {
      if (new Date(req.expires_at).getTime() <= now) {
        expireAuthorizationRequest(id, 'auto_ttl');
        expired += 1;
      }
    }
  }
  return { expired_count: expired };
}

function getAuthorizationRequests({ status = null, limit = 50 } = {}) {
  let items = [..._requests.values()];
  if (status) items = items.filter(r => r.status === status);
  items = items.slice(-limit).reverse();

  const pending = [..._requests.values()].filter(r =>
    r.status === 'PENDING' || r.status === 'PARTIALLY_APPROVED'
  );

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    total: _requests.size,
    pending_count: pending.length,
    items,
    timestamp: new Date().toISOString()
  };
}

function getRegistryStatus() {
  const all = [..._requests.values()];
  const byStatus = {};
  for (const r of all) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    registry_ready: true,
    total_requests: all.length,
    by_status: byStatus,
    runtime_authorized: false,
    auto_authorize: false,
    timestamp: new Date().toISOString()
  };
}

function resetRegistryForCert() {
  _requests.clear();
  _seq = 0;
}

module.exports = {
  createAuthorizationRequest,
  addApproval,
  rejectAuthorizationRequest,
  expireAuthorizationRequest,
  revokeAuthorizationRequest,
  invalidateByStateChange,
  processPendingExpirations,
  getAuthorizationRequests,
  getRegistryStatus,
  resetRegistryForCert,
  LAYER
};
