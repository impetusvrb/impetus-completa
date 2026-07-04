'use strict';

/**
 * SEC-18 — Approval Coordinator.
 */

const store = require('../store/runtimeProtectionStore');
const metrics = require('../metrics/runtimeProtectionMetrics');
const flags = require('../config/securityRuntimeProtectionFlags');

const APPROVAL_TYPES = Object.freeze([
  'single',
  'dual',
  'emergency',
  'expired',
  'revoked'
]);

function createApprovalRequest(profileId, riskAssessment, plans) {
  const needsDual = profileId === 'HARDENED' || profileId === 'LOCKDOWN_READY';
  const type = needsDual ? 'dual' : 'single';

  const approval = {
    schema_version: 'runtime_approval_v1',
    approvalId: `rap-${Date.now()}`,
    type,
    status: 'PENDING',
    targetProfile: profileId,
    requiredApprovers: needsDual ? 2 : 1,
    currentApprovers: 0,
    approvers: [],
    protectionUrgency: riskAssessment.protectionUrgency,
    planCount: (plans || []).length,
    auto_execute: false,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    revoked: false,
    approvalRequired: flags.requireApproval(),
    createdAt: new Date().toISOString()
  };

  store.addApproval(approval);
  metrics.increment('runtime_approvals');
  return approval;
}

function resolveApprovalStatus(approval) {
  if (!approval) {
    return { status: 'NOT_REQUIRED', request: null, executionEligible: false };
  }
  if (approval.revoked) return { status: 'REVOKED', request: approval, executionEligible: false };
  if (new Date(approval.expiresAt) < new Date()) {
    return { status: 'EXPIRED', request: approval, executionEligible: false };
  }
  if (approval.currentApprovers >= approval.requiredApprovers) {
    return { status: 'APPROVED', request: approval, executionEligible: false };
  }
  return { status: 'PENDING', request: approval, executionEligible: false };
}

function registerApproval(approvalId, approver, reason) {
  const approvals = store.getApprovals(100);
  const approval = approvals.find((a) => a.approvalId === approvalId);
  if (!approval || approval.revoked) return null;
  approval.approvers.push({ approver, reason, at: new Date().toISOString() });
  approval.currentApprovers = approval.approvers.length;
  return approval;
}

function revokeApproval(approvalId, reason) {
  const approvals = store.getApprovals(100);
  const approval = approvals.find((a) => a.approvalId === approvalId);
  if (!approval) return null;
  approval.revoked = true;
  approval.status = 'REVOKED';
  approval.revokeReason = reason;
  return approval;
}

module.exports = {
  APPROVAL_TYPES,
  createApprovalRequest,
  resolveApprovalStatus,
  registerApproval,
  revokeApproval
};
