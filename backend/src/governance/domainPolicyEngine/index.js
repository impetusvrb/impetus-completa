'use strict';

/**
 * Domain Policy Engine — exports centrais.
 *
 * Módulo de governança para Safety (Z.25) e Environment (P1).
 * Integra: Policy Evaluator + HITL Approval + Shadow Exit Gate.
 */

const policyEvaluator = require('./domainPolicyEvaluator');
const approvalService = require('./domainPublicationApprovalService');
const shadowExitGate = require('./shadowExitGate');

module.exports = {
  evaluate: policyEvaluator.evaluate,
  getEngineHealth: policyEvaluator.getEngineHealth,
  reloadPolicies: policyEvaluator.reloadPolicies,

  submitForApproval: approvalService.submitForApproval,
  approve: approvalService.approve,
  reject: approvalService.reject,
  listPendingApprovals: approvalService.listPending,
  canApprove: approvalService.canApprove,
  canOperate: approvalService.canOperate,
  resolveRoleClass: approvalService.resolveRoleClass,
  PUBLICATION_ROLES: approvalService.PUBLICATION_ROLES,

  evaluateGate: shadowExitGate.evaluateGate
};
