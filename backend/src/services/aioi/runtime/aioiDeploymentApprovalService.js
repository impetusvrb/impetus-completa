'use strict';

/**
 * AIOI-P1K.3 — Deployment Approval Framework
 * Approval-based only · sem auto-aprovação · sem IA.
 */

const os = require('os');

const LAYER = 'AIOI_DEPLOYMENT_APPROVAL';
const MAX_APPROVALS = 100;

const _approvals = new Map();
let _seq = 0;

function _nextId() {
  _seq += 1;
  return `APR-${Date.now()}-${_seq}`;
}

function requestApproval(payload = {}) {
  const id = _nextId();
  const approval = {
    approval_id: id,
    approval_status: 'PENDING',
    approved: false,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    scope: payload.scope || 'enterprise_production_deployment',
    requested_by: payload.requested_by || 'system',
    requested_at: new Date().toISOString(),
    hostname: os.hostname(),
    pid: process.pid,
    metadata: payload.metadata || {},
    auto_approval: false
  };
  _approvals.set(id, approval);
  if (_approvals.size > MAX_APPROVALS) {
    const oldest = _approvals.keys().next().value;
    _approvals.delete(oldest);
  }
  return approval;
}

function grantApproval({ approval_id, approved_by, note = null } = {}) {
  const approval = _approvals.get(approval_id);
  if (!approval) {
    return { ok: false, error: 'approval_not_found', approval_id };
  }
  if (approval.approval_status !== 'PENDING') {
    return { ok: false, error: 'approval_not_pending', approval_id, status: approval.approval_status };
  }
  if (!approved_by) {
    return { ok: false, error: 'approved_by_required', approval_id };
  }

  approval.approval_status = 'APPROVED';
  approval.approved = true;
  approval.approved_by = approved_by;
  approval.approved_at = new Date().toISOString();
  approval.approval_note = note;
  _approvals.set(approval_id, approval);

  return { ok: true, approval };
}

function rejectApproval({ approval_id, rejected_by, reason = null } = {}) {
  const approval = _approvals.get(approval_id);
  if (!approval) {
    return { ok: false, error: 'approval_not_found', approval_id };
  }
  if (approval.approval_status !== 'PENDING') {
    return { ok: false, error: 'approval_not_pending', approval_id };
  }

  approval.approval_status = 'REJECTED';
  approval.approved = false;
  approval.rejected_by = rejected_by || 'unknown';
  approval.rejected_at = new Date().toISOString();
  approval.rejection_reason = reason;
  _approvals.set(approval_id, approval);

  return { ok: true, approval };
}

function getApprovalStatus(approvalId = null) {
  if (approvalId) {
    const approval = _approvals.get(approvalId);
    if (!approval) {
      return {
        ok: false,
        layer: LAYER,
        approval_status: 'NOT_FOUND',
        approved: false,
        approved_by: null,
        approved_at: null
      };
    }
    return {
      ok: true,
      layer: LAYER,
      read_only: true,
      ...approval
    };
  }

  const pending = [..._approvals.values()].filter(a => a.approval_status === 'PENDING');
  const latest = [..._approvals.values()].pop() || null;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    approval_status: latest?.approval_status || 'NONE',
    approved: latest?.approved ?? false,
    approved_by: latest?.approved_by ?? null,
    approved_at: latest?.approved_at ?? null,
    pending_count: pending.length,
    latest_approval: latest,
    framework_ready: true,
    auto_approval: false,
    timestamp: new Date().toISOString()
  };
}

function resetApprovalsForCert() {
  _approvals.clear();
  _seq = 0;
}

module.exports = {
  requestApproval,
  grantApproval,
  rejectApproval,
  getApprovalStatus,
  resetApprovalsForCert,
  LAYER
};
