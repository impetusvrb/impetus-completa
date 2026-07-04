'use strict';

/**
 * SEC-13 — Controlled Execution DTO.
 */

function createControlledExecutionDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'controlled_execution_v1',
    read_only: false,
    enabled: input.enabled === true,
    auto_execution_level: input.auto_execution_level || 'LOW',
    manual_approval_required: input.manual_approval_required !== false,
    executionStatus: input.executionStatus || 'IDLE',
    executedActions: Array.isArray(input.executedActions) ? [...input.executedActions] : [],
    pendingApprovals: Array.isArray(input.pendingApprovals) ? [...input.pendingApprovals] : [],
    blockedActions: Array.isArray(input.blockedActions) ? [...input.blockedActions] : [],
    rollbackAvailable: input.rollbackAvailable === true,
    executionHistory: Array.isArray(input.executionHistory) ? [...input.executionHistory] : [],
    executionSafetyScore: input.executionSafetyScore ?? 100,
    sec11_snapshot: input.sec11_snapshot || null,
    sec12_snapshot: input.sec12_snapshot || null,
    auto_executable_catalog: input.auto_executable_catalog || [],
    metrics: input.metrics || {},
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createControlledExecutionDashboardDto, freezeDto };
