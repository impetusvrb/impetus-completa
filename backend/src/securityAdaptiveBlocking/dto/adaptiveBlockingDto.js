'use strict';

/**
 * SEC-14 — Adaptive Blocking DTOs.
 */

function createAdaptiveBlockingDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'adaptive_blocking_v1',
    read_only: true,
    enabled: input.enabled === true,
    blocking_mode: input.blocking_mode || 'observe',
    require_approval: input.require_approval !== false,
    blockingStatus: input.blockingStatus || 'NORMAL',
    reputationScore: input.reputationScore ?? null,
    behaviorScore: input.behaviorScore ?? null,
    fingerprintConfidence: input.fingerprintConfidence ?? null,
    recommendedAction: input.recommendedAction || 'no_action',
    recommendationReason: input.recommendationReason || null,
    executionAllowed: false,
    approvalRequired: input.approvalRequired !== false,
    reputations: input.reputations || [],
    blacklistSummary: input.blacklistSummary || null,
    behaviorProfiles: input.behaviorProfiles || [],
    fingerprints: input.fingerprints || [],
    recommendations: input.recommendations || [],
    modules_snapshot: input.modules_snapshot || {},
    metrics: input.metrics || {},
    disclaimer: input.disclaimer || 'SEC-14 — recomendações only, nenhum bloqueio executado',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createAdaptiveBlockingDashboardDto, freezeDto };
