'use strict';

/**
 * SEC-18 — Runtime Protection DTO.
 */

function createRuntimeProtectionDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'runtime_protection_v1',
    read_only: true,
    enabled: input.enabled === true,
    mode: input.mode || 'observe',
    protectionStatus: input.protectionStatus || 'NORMAL',
    currentProfile: input.currentProfile || 'NORMAL',
    recommendedProfile: input.recommendedProfile || 'NORMAL',
    runtimeRiskScore: input.runtimeRiskScore ?? null,
    protectionUrgency: input.protectionUrgency ?? null,
    approvalStatus: input.approvalStatus || { status: 'NOT_REQUIRED', executionEligible: false },
    rollbackAvailable: input.rollbackAvailable !== false,
    executionEligible: false,
    recommendedActions: input.recommendedActions || [],
    riskAssessment: input.riskAssessment || null,
    safetyCheck: input.safetyCheck || null,
    protectionPlans: input.protectionPlans || [],
    profiles: input.profiles || [],
    modules_snapshot: input.modules_snapshot || {},
    metrics: input.metrics || {},
    disclaimer: input.disclaimer || 'SEC-18 — controlador consultivo, nenhuma execução automática',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createRuntimeProtectionDashboardDto, freezeDto };
