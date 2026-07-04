'use strict';

/**
 * SEC-06 — Security Response DTO.
 */

const LEVELS = Object.freeze(['OBSERVE', 'ADVISE', 'ASSIST', 'PROTECT']);
const EXECUTION_STATUSES = Object.freeze(['pending', 'planned', 'partial', 'completed', 'cancelled', 'blocked']);

let seq = 0;

function nextResponseId() {
  seq += 1;
  return `resp-${Date.now()}-${seq.toString(36)}`;
}

/**
 * @param {object} input
 * @returns {object}
 */
function createSecurityResponseDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'security_response_v1',
    responseId: input.responseId || nextResponseId(),
    incidentId: input.incidentId || null,
    notificationId: input.notificationId || null,
    recommendedLevel: LEVELS.includes(input.recommendedLevel) ? input.recommendedLevel : 'OBSERVE',
    currentMode: LEVELS.includes(input.currentMode) ? input.currentMode : 'OBSERVE',
    recommendedActions: Array.isArray(input.recommendedActions) ? [...input.recommendedActions] : [],
    executedActions: Array.isArray(input.executedActions) ? [...input.executedActions] : [],
    reversible: input.reversible !== false,
    approvalRequired: Boolean(input.approvalRequired),
    rollbackAvailable: Boolean(input.rollbackAvailable),
    executionStatus: EXECUTION_STATUSES.includes(input.executionStatus) ? input.executionStatus : 'pending',
    responseTimeline: Array.isArray(input.responseTimeline) ? [...input.responseTimeline] : [],
    catalogEntries: Array.isArray(input.catalogEntries) ? [...input.catalogEntries] : [],
    adaptiveProtectionPlan: input.adaptiveProtectionPlan || null,
    rollbackSteps: Array.isArray(input.rollbackSteps) ? [...input.rollbackSteps] : [],
    operatorRequired: Boolean(input.operatorRequired),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now
  };
}

function freezeResponse(r) {
  return Object.freeze(JSON.parse(JSON.stringify(r)));
}

module.exports = {
  LEVELS,
  EXECUTION_STATUSES,
  createSecurityResponseDto,
  freezeResponse,
  nextResponseId
};
