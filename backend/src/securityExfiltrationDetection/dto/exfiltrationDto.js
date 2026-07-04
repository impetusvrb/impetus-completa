'use strict';

/**
 * SEC-17 — Exfiltration Detection DTO.
 */

function createExfiltrationDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'exfiltration_detection_v1',
    read_only: true,
    enabled: input.enabled === true,
    mode: input.mode || 'observe',
    detectionStatus: input.detectionStatus || 'CLEAR',
    exfiltrationConfidence: input.exfiltrationConfidence ?? null,
    scrapingConfidence: input.scrapingConfidence ?? null,
    protectedAssets: input.protectedAssets || [],
    suspiciousAssets: input.suspiciousAssets || [],
    movementProfile: input.movementProfile || null,
    timeline: input.timeline || null,
    evidenceStrength: input.evidenceStrength ?? null,
    recommendations: input.recommendations || [],
    approvalRequired: input.approvalRequired !== false,
    executionAllowed: false,
    confidence: input.confidence || null,
    accessProfiles: input.accessProfiles || [],
    movementProfiles: input.movementProfiles || [],
    modules_snapshot: input.modules_snapshot || {},
    metrics: input.metrics || {},
    disclaimer: input.disclaimer || 'SEC-17 — consultivo only, nenhum bloqueio de download',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createExfiltrationDashboardDto, freezeDto };
