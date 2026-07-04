'use strict';

/**
 * SEC-11 — Adaptive Protection DTOs.
 */

function createProtectionPlanDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'protection_plan_v1',
    planId: input.planId || `prot-plan-${Date.now()}`,
    incidentId: input.incidentId || null,
    currentProfile: input.currentProfile || 'NORMAL',
    recommendedProfile: input.recommendedProfile || 'NORMAL',
    surfacePlan: input.surfacePlan || null,
    antiScannerRecommendations: input.antiScannerRecommendations || [],
    summary: input.summary || null,
    rollback: input.rollback || { action: 'SECURITY_ADAPTIVE_PROTECTION=false' },
    read_only: true,
    auto_execute: false,
    requiresApproval: input.requiresApproval !== false,
    createdAt: input.createdAt || now
  };
}

function createAdaptiveProtectionDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'adaptive_protection_v1',
    read_only: true,
    enabled: input.enabled === true,
    protection_mode: input.protection_mode || 'observe',
    currentProtectionProfile: input.currentProtectionProfile || 'NORMAL',
    recommendedProfile: input.recommendedProfile || 'NORMAL',
    runtimeScore: input.runtimeScore ?? null,
    threatScore: input.threatScore ?? null,
    protectionScore: input.protectionScore ?? null,
    approvalStatus: input.approvalStatus || { status: 'NOT_REQUIRED', request: null },
    protectionPlan: input.protectionPlan || null,
    recoveryPlan: input.recoveryPlan || null,
    rollbackPlan: input.rollbackPlan || null,
    postIncidentPlan: input.postIncidentPlan || null,
    timeline: Array.isArray(input.timeline) ? [...input.timeline] : [],
    scannerPatterns: input.scannerPatterns || [],
    modules_snapshot: input.modules_snapshot || {},
    metrics: input.metrics || {},
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = {
  createProtectionPlanDto,
  createAdaptiveProtectionDashboardDto,
  freezeDto
};
