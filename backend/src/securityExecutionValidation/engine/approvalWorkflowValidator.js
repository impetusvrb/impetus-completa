'use strict';

/**
 * SEC-12 — Approval Workflow Validator.
 */

const metrics = require('../metrics/executionValidationMetrics');

const VALID_STATUSES = Object.freeze(['VALID', 'PENDING', 'EXPIRED', 'REVOKED', 'INSUFFICIENT']);

function validateApproval(approvalRequest, recommendedProfile) {
  if (!approvalRequest) {
    metrics.increment('approval_failures');
    return {
      status: 'INSUFFICIENT',
      valid: false,
      reason: 'no_approval_request',
      type: null
    };
  }

  const now = Date.now();
  const requestedAt = new Date(approvalRequest.requestedAt || 0).getTime();
  const maxAgeMs = 4 * 60 * 60 * 1000;
  if (requestedAt && now - requestedAt > maxAgeMs) {
    metrics.increment('approval_failures');
    return {
      status: 'EXPIRED',
      valid: false,
      reason: 'approval_expired',
      type: approvalRequest.approvalType
    };
  }

  if (approvalRequest.revoked === true) {
    metrics.increment('approval_failures');
    return { status: 'REVOKED', valid: false, reason: 'approval_revoked', type: approvalRequest.approvalType };
  }

  const type = approvalRequest.approvalType || 'single';
  const required = approvalRequest.requiredApprovals || 1;
  const current = approvalRequest.currentApprovals || 0;
  const approved = approvalRequest.status === 'APPROVED' || approvalRequest.status === 'APPROVED_EMERGENCY';

  if (type === 'dual' && current < 2 && !approved) {
    metrics.increment('approval_failures');
    return {
      status: 'INSUFFICIENT',
      valid: false,
      reason: 'dual_approval_incomplete',
      type: 'dual',
      current,
      required: 2
    };
  }

  if (type === 'single' && current < 1 && !approved) {
    metrics.increment('approval_failures');
    return { status: 'PENDING', valid: false, reason: 'single_approval_pending', type: 'single' };
  }

  if (type === 'emergency' && approvalRequest.status !== 'APPROVED_EMERGENCY' && !approved) {
    return { status: 'PENDING', valid: false, reason: 'emergency_approval_pending', type: 'emergency' };
  }

  if (['PROTECTED', 'LOCKDOWN'].includes(recommendedProfile) && type !== 'dual' && !approved) {
    metrics.increment('approval_failures');
    return {
      status: 'INSUFFICIENT',
      valid: false,
      reason: 'dual_required_for_profile',
      type
    };
  }

  return {
    status: 'VALID',
    valid: true,
    reason: approvalRequest.status || 'approved',
    type,
    approvers: (approvalRequest.approvedBy || []).map((a) => a.approver)
  };
}

module.exports = { VALID_STATUSES, validateApproval };
