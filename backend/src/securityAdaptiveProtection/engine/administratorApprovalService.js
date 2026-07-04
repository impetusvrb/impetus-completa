'use strict';

/**
 * SEC-11 — Administrator Approval Engine.
 * Nenhuma protecção executada sem aprovação registada.
 */

const flags = require('../config/securityAdaptiveProtectionFlags');
const store = require('../store/adaptiveProtectionStore');
const metrics = require('../metrics/adaptiveProtectionMetrics');

const APPROVAL_TYPES = Object.freeze(['dual', 'single', 'emergency']);

function resolveApprovalType(recommendedProfile) {
  if (recommendedProfile === 'LOCKDOWN') return 'dual';
  if (recommendedProfile === 'PROTECTED') return 'dual';
  if (recommendedProfile === 'DEFENSE') return 'single';
  return 'single';
}

function createApprovalRequest(plan, requestedBy = 'system') {
  const type = resolveApprovalType(plan.recommendedProfile);
  const request = {
    schema_version: 'approval_request_v1',
    requestId: `apr-${Date.now()}`,
    planId: plan.planId,
    approvalType: type,
    requiredApprovals: type === 'dual' ? 2 : 1,
    currentApprovals: 0,
    status: 'PENDING',
    requestedBy,
    requestedAt: new Date().toISOString(),
    reason: plan.summary || 'Adaptive protection plan requires approval',
    rollback: plan.rollback || null,
    approvedBy: [],
    executed: false,
    requireApproval: flags.requireApproval()
  };
  metrics.increment('approval_requests');
  return request;
}

function registerApproval(request, approver, reason, approvalType = 'single') {
  if (!request || request.status === 'APPROVED') return request;

  const record = {
    approver,
    reason,
    approvalType,
    at: new Date().toISOString(),
    rollback: request.rollback
  };

  request.approvedBy = request.approvedBy || [];
  request.approvedBy.push(record);
  request.currentApprovals = request.approvedBy.length;

  if (request.approvalType === 'dual' && request.currentApprovals >= 2) {
    request.status = 'APPROVED';
    metrics.increment('approved_protections');
  } else if (request.approvalType !== 'dual' && request.currentApprovals >= 1) {
    request.status = 'APPROVED';
    metrics.increment('approved_protections');
  } else if (approvalType === 'emergency' && request.currentApprovals >= 1) {
    request.status = 'APPROVED_EMERGENCY';
    metrics.increment('approved_protections');
  }

  store.addApprovalRecord({ ...record, requestId: request.requestId, status: request.status });
  return request;
}

function canExecutePlan(request) {
  if (!flags.requireApproval()) return false;
  return request?.status === 'APPROVED' || request?.status === 'APPROVED_EMERGENCY';
}

module.exports = {
  APPROVAL_TYPES,
  resolveApprovalType,
  createApprovalRequest,
  registerApproval,
  canExecutePlan
};
